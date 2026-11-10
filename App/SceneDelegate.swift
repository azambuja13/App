import UIKit
import Capacitor
import Network

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = AppViewController()
        window?.makeKeyAndVisible()
    }
}

/// Tela principal do app: o CAPBridgeViewController com os plugins nativos próprios do app.
/// (Ficam neste arquivo para não precisar mexer no projeto do Xcode.)
class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(EscPosPrinterPlugin())
    }
}

/// Impressão direta em térmica ESC/POS pela rede (Wi-Fi), TCP na porta 9100 (padrão das térmicas).
/// JS: Capacitor.Plugins.EscPosPrinter.send({ host: '192.168.100.36', port: 9100, data: '<bytes em base64>', timeoutMs: 8000 })
@objc(EscPosPrinterPlugin)
public class EscPosPrinterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "EscPosPrinterPlugin"
    public let jsName = "EscPosPrinter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "send", returnType: CAPPluginReturnPromise)
    ]

    @objc func send(_ call: CAPPluginCall) {
        let host = (call.getString("host") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !host.isEmpty else { call.reject("Informe o IP da impressora."); return }
        guard let b64 = call.getString("data"), let dados = Data(base64Encoded: b64), !dados.isEmpty else {
            call.reject("Nada para imprimir."); return
        }
        let numeroPorta = call.getInt("port") ?? 9100
        guard numeroPorta > 0, numeroPorta < 65536, let porta = NWEndpoint.Port(rawValue: UInt16(numeroPorta)) else {
            call.reject("Porta inválida."); return
        }
        let limite = Double(call.getInt("timeoutMs") ?? 8000) / 1000.0

        // Tudo roda nesta fila serial: o estado abaixo só é lido/escrito nela.
        let fila = DispatchQueue(label: "com.precificacao.escpos")
        let conexao = NWConnection(host: NWEndpoint.Host(host), port: porta, using: .tcp)
        var terminou = false
        var ultimoAviso = ""

        let fim: (String?) -> Void = { erro in
            if terminou { return }
            terminou = true
            conexao.stateUpdateHandler = nil
            conexao.cancel()
            if let erro = erro { call.reject(erro) } else { call.resolve(["bytes": dados.count]) }
        }

        conexao.stateUpdateHandler = { estado in
            switch estado {
            case .ready:
                conexao.send(content: dados, completion: .contentProcessed { erro in
                    if let erro = erro {
                        fim("Falha ao enviar para a impressora: \(erro.localizedDescription)")
                        return
                    }
                    // dá tempo da impressora receber tudo antes de fechar a conexão
                    fila.asyncAfter(deadline: .now() + 0.5) { fim(nil) }
                })
            case .waiting(let erro):
                ultimoAviso = erro.localizedDescription
            case .failed(let erro):
                fim("Não foi possível conectar na impressora \(host): \(erro.localizedDescription)")
            default:
                break
            }
        }
        conexao.start(queue: fila)
        fila.asyncAfter(deadline: .now() + limite) {
            var msg = "A impressora \(host) não respondeu. Confira se ela está ligada e na mesma rede Wi-Fi do iPhone, e se o app tem permissão de Rede Local (Ajustes › Calculadora Precificação)."
            if !ultimoAviso.isEmpty { msg += " (\(ultimoAviso))" }
            fim(msg)
        }
    }
}

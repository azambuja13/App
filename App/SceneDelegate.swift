import UIKit
import Capacitor
import Network
import EventKit
import EventKitUI

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
        bridge?.registerPluginInstance(AgendaPlugin())
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

/// Salvar evento no Calendário do iPhone: abre a tela nativa "Novo evento" já preenchida.
/// O usuário confere e toca em "Adicionar". No iOS 17+ essa tela não pede permissão de acesso ao Calendário.
/// JS: Capacitor.Plugins.Agenda.adicionar({ titulo, data: '2026-12-10', inicio: '19:00' ou '' (dia inteiro),
///     duracaoMin: 300, local, notas, alertaMin: 1440 }) → { salvo: true/false }
@objc(AgendaPlugin)
public class AgendaPlugin: CAPPlugin, CAPBridgedPlugin, EKEventEditViewDelegate {
    public let identifier = "AgendaPlugin"
    public let jsName = "Agenda"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "adicionar", returnType: CAPPluginReturnPromise)
    ]
    private let loja = EKEventStore()
    private var chamada: CAPPluginCall?

    @objc func adicionar(_ call: CAPPluginCall) {
        let partes = (call.getString("data") ?? "").split(separator: "-").compactMap { Int($0) }
        var dc = DateComponents()
        if partes.count == 3 { dc.year = partes[0]; dc.month = partes[1]; dc.day = partes[2] }
        guard partes.count == 3, let dia = Calendar.current.date(from: dc) else {
            call.reject("Informe a data do evento."); return
        }
        let hm = (call.getString("inicio") ?? "").split(separator: ":").compactMap { Int($0) }
        let duracaoMin = max(call.getInt("duracaoMin") ?? 300, 15)
        let alertaMin = call.getInt("alertaMin") ?? 0

        DispatchQueue.main.async {
            guard let tela = self.bridge?.viewController else { call.reject("Tela do app indisponível."); return }
            let ev = EKEvent(eventStore: self.loja)
            ev.title = call.getString("titulo") ?? "Evento"
            if let local = call.getString("local"), !local.isEmpty { ev.location = local }
            if let notas = call.getString("notas"), !notas.isEmpty { ev.notes = notas }
            if hm.count >= 1, hm[0] >= 0, hm[0] < 24 {
                let inicio = Calendar.current.date(bySettingHour: hm[0], minute: hm.count > 1 ? hm[1] : 0, second: 0, of: dia) ?? dia
                ev.isAllDay = false
                ev.startDate = inicio
                ev.endDate = inicio.addingTimeInterval(TimeInterval(duracaoMin * 60))
            } else {
                ev.isAllDay = true
                ev.startDate = dia
                ev.endDate = dia
            }
            if alertaMin > 0 { ev.addAlarm(EKAlarm(relativeOffset: -TimeInterval(alertaMin * 60))) }

            let editor = EKEventEditViewController()
            editor.eventStore = self.loja
            editor.event = ev
            editor.editViewDelegate = self
            self.chamada?.resolve(["salvo": false]) // uma tela por vez
            self.chamada = call
            var topo = tela
            while let p = topo.presentedViewController { topo = p }
            topo.present(editor, animated: true)
        }
    }

    public func eventEditViewController(_ controller: EKEventEditViewController, didCompleteWith action: EKEventEditViewAction) {
        controller.dismiss(animated: true)
        chamada?.resolve(["salvo": action == .saved])
        chamada = nil
    }
}

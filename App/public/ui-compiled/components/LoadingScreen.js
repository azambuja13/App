(function() {
/**
 * LoadingScreen - Tela de carregamento com progresso
 * Mostra o progresso do carregamento de dados após autenticação
 */
function LoadingScreen({
  progress = 0,
  message = 'Carregando dados...'
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center z-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full mb-4"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-8 h-8 text-white animate-spin",
    fill: "none",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("circle", {
    className: "opacity-25",
    cx: "12",
    cy: "12",
    r: "10",
    stroke: "currentColor",
    strokeWidth: "4"
  }), /*#__PURE__*/React.createElement("path", {
    className: "opacity-75",
    fill: "currentColor",
    d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
  }))), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-800 mb-2"
  }, "Preparando Sistema"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, message)), /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-gray-700"
  }, "Progresso"), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold text-orange-600"
  }, Math.round(progress), "%")), /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-gray-200 rounded-full h-3 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500 ease-out",
    style: {
      width: `${progress}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 pt-6 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 text-center"
  }, "Isso pode levar alguns segundos..."))));
}

// Expor ao window para uso global
window.LoadingScreen = LoadingScreen;
})();

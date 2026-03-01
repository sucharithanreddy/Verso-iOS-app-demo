/**
 * Verso Widget
 * Embed this on any website to add AI-powered thought reframing
 * 
 * Usage:
 *   <script src="https://verso.app/widget.js"></script>
 *   <script>
 *     VersoWidget.init({
 *       position: 'bottom-right',
 *       primaryColor: '#3b82f6',
 *       greeting: "Hi! I'm here to help."
 *     });
 *   </script>
 */

(function() {
  'use strict';

  const WIDGET_URL = 'https://verso.app/widget';
  
  let config = {
    position: 'bottom-right',
    primaryColor: '#3b82f6',
    secondaryColor: '#14b8a6',
    greeting: "Hi! I'm here to help you transform negative thoughts.",
    buttonText: 'Need to talk?',
    zIndex: 9999,
  };

  let isOpen = false;
  let container = null;
  let bubble = null;
  let iframe = null;

  function mergeConfig(userConfig) {
    config = { ...config, ...userConfig };
  }

  function createStyles() {
    const style = document.createElement('style');
    style.id = 'verso-widget-styles';
    style.textContent = `
      .verso-widget-bubble {
        position: fixed;
        ${config.position.includes('right') ? 'right: 24px;' : 'left: 24px;'}
        bottom: 24px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor});
        box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: ${config.zIndex};
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        border: none;
        padding: 0;
      }
      
      .verso-widget-bubble:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px rgba(59, 130, 246, 0.4);
      }
      
      .verso-widget-bubble svg {
        width: 28px;
        height: 28px;
        fill: white;
      }
      
      .verso-widget-container {
        position: fixed;
        ${config.position.includes('right') ? 'right: 24px;' : 'left: 24px;'}
        bottom: 100px;
        width: 380px;
        height: 580px;
        border-radius: 20px;
        box-shadow: 0 10px 50px rgba(59, 130, 246, 0.2);
        z-index: ${config.zIndex};
        overflow: hidden;
        opacity: 0;
        transform: scale(0.8) translateY(20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: none;
        background: white;
        border: 1px solid rgba(59, 130, 246, 0.1);
      }
      
      .verso-widget-container.open {
        opacity: 1;
        transform: scale(1) translateY(0);
        pointer-events: auto;
      }
      
      .verso-widget-iframe {
        width: 100%;
        height: 100%;
        border: none;
        background: transparent;
      }
      
      .verso-widget-pulse {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: ${config.primaryColor};
        animation: verso-pulse 2s infinite;
        opacity: 0.4;
      }
      
      @keyframes verso-pulse {
        0% { transform: scale(1); opacity: 0.4; }
        50% { transform: scale(1.3); opacity: 0; }
        100% { transform: scale(1); opacity: 0; }
      }
      
      @media (max-width: 480px) {
        .verso-widget-container {
          width: calc(100vw - 48px);
          height: calc(100vh - 150px);
          bottom: 100px;
          ${config.position.includes('right') ? 'right: 24px;' : 'left: 24px;'}
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createBubble() {
    bubble = document.createElement('button');
    bubble.className = 'verso-widget-bubble';
    bubble.innerHTML = `
      <div class="verso-widget-pulse"></div>
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
      </svg>
    `;
    bubble.onclick = toggleWidget;
    document.body.appendChild(bubble);
  }

  function createContainer() {
    container = document.createElement('div');
    container.className = 'verso-widget-container';
    
    iframe = document.createElement('iframe');
    iframe.className = 'verso-widget-iframe';
    iframe.src = WIDGET_URL;
    iframe.allow = 'microphone; camera';
    container.appendChild(iframe);
    
    document.body.appendChild(container);
  }

  function toggleWidget() {
    isOpen = !isOpen;
    if (isOpen) {
      container.classList.add('open');
      bubble.style.display = 'none';
    } else {
      container.classList.remove('open');
      bubble.style.display = 'flex';
    }
  }

  function closeWidget() {
    isOpen = false;
    container.classList.remove('open');
    bubble.style.display = 'flex';
  }

  function handleMessage(event) {
    if (event.data.type === 'CLOSE_WIDGET') {
      closeWidget();
    }
  }

  function init(userConfig = {}) {
    mergeConfig(userConfig);
    createStyles();
    createBubble();
    createContainer();
    
    window.addEventListener('message', handleMessage);
    
    // Expose API
    window.VersoWidget = {
      open: () => { if (!isOpen) toggleWidget(); },
      close: closeWidget,
      toggle: toggleWidget,
      destroy: () => {
        bubble?.remove();
        container?.remove();
        document.getElementById('verso-widget-styles')?.remove();
        window.removeEventListener('message', handleMessage);
      }
    };
  }

  // Auto-init if config is passed in script tag
  if (document.currentScript) {
    const scriptConfig = document.currentScript.dataset;
    if (Object.keys(scriptConfig).length > 0) {
      const parsedConfig = {};
      for (const [key, value] of Object.entries(scriptConfig)) {
        parsedConfig[key] = value;
      }
      document.addEventListener('DOMContentLoaded', () => init(parsedConfig));
    }
  }

  // Export init function
  window.VersoWidget = { init };

})();

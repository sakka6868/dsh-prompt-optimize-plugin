// dsh-prompt-optimize-plugin — static client half (module-loader factory bundle).
//
// Adapted from src/client.js for the STATIC plugin form:
//   - registered via window.__ModuleLoader__.load({ id, factory });
//   - React arrives through require('react');
//   - the dynamic plugin's host.call is replaced by fetch('/prompt-optimize');
//   - styles use the official per-plugin <style data-plugin-css> pattern.
// Component logic, store shape, slot ids and CSS rules are unchanged from
// src/client.js.
window.__ModuleLoader__.load({
  id: 'dsh-prompt-optimize-plugin',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require('react');

    const STYLE_TAG_ID = 'dsh-prompt-optimize-plugin';

    const CSS = '.prompt-optimize-btn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:1;cursor:pointer;order:1}.prompt-optimize-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.prompt-optimize-btn:disabled{opacity:.45;cursor:default}.prompt-optimize-btn.is-busy{color:var(--dsw-alias-brand-primary)}[data-composer-card] .uV2eYG_primary{order:2}.prompt-optimize-panel{position:absolute;bottom:calc(100% + 8px);left:0;box-sizing:border-box;display:flex;flex-direction:column;gap:6px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.5;box-shadow:var(--dsw-shadow-lv2);overflow:hidden}.prompt-optimize-panel.is-loading{justify-content:center;align-items:center;color:var(--dsw-alias-label-secondary)}.prompt-optimize-panel.is-error{border-color:var(--dsw-alias-state-error-primary)}.prompt-optimize-panel-head{display:flex;flex:none;align-items:center;justify-content:space-between;gap:8px}.prompt-optimize-title{font-weight:600;font-size:12px}.prompt-optimize-panel-actions{display:inline-flex;gap:6px}.prompt-optimize-primary{padding:2px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer;font-size:11px;line-height:1.4}.prompt-optimize-primary:hover{border-color:var(--dsw-alias-brand-primary)}.prompt-optimize-ghost{padding:2px 8px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:11px;line-height:1.4}.prompt-optimize-ghost:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}.prompt-optimize-error-text{color:var(--dsw-alias-state-error-primary);flex:1}.prompt-optimize-result{max-height:320px;overflow-y:auto;padding:8px 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.5}.prompt-optimize-orig-toggle{flex:none;font-size:11px;color:var(--dsw-alias-label-secondary)}.prompt-optimize-orig-toggle summary{cursor:pointer;user-select:none;list-style-position:inside}.prompt-optimize-orig-toggle summary:hover{color:var(--dsw-alias-label-primary)}.prompt-optimize-orig{margin-top:6px;max-height:120px;overflow-y:auto;padding:6px 8px;border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.45}';

    let styleTag = document.querySelector('style[data-plugin-css="' + STYLE_TAG_ID + '"]');
    if (styleTag === null) {
      styleTag = document.createElement('style');
      styleTag.dataset.pluginCss = STYLE_TAG_ID;
      styleTag.textContent = CSS;
      document.head.appendChild(styleTag);
    }

    function createStore() {
      return {
        data: { loading: false, result: null, error: null, sessionId: null },
        subs: new Set(),
        get() { return this.data },
        set(patch) {
          this.data = Object.assign({}, this.data, patch)
          this.subs.forEach((fn) => fn())
        },
        subscribe(fn) {
          this.subs.add(fn)
          return () => { this.subs.delete(fn) }
        },
      }
    }

    function useStore(store) {
      const [state, setState] = React.useState(store.get())
      React.useEffect(() => store.subscribe(() => setState(store.get())), [])
      return state
    }

    function callOptimize(text) {
      return fetch('/prompt-optimize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      }).then((res) => res.json()).catch((err) => {
        return { ok: false, error: '调用失败: ' + ((err && err.message) ? String(err.message) : String(err)) }
      })
    }

    function PromptOptimizeButton(props) {
      const store = props.store
      const state = useStore(store)
      const input = props.useInput((s) => s)
      const draft = (input && typeof input.draft === 'string') ? input.draft : ''
      const can = draft.trim().length > 0 && !state.loading
      const onOptimize = () => {
        if (!can) return
        store.set({ loading: true, error: null, result: null, sessionId: props.sessionId })
        callOptimize(draft.trim()).then((reply) => {
          if (reply && reply.ok && typeof reply.text === 'string') {
            store.set({ loading: false, result: { original: draft, optimized: reply.text } })
          } else {
            store.set({ loading: false, error: (reply && reply.error) ? String(reply.error) : '优化失败' })
          }
        })
      }
      return React.createElement(
        'button',
        {
          className: 'prompt-optimize-btn' + (state.loading ? ' is-busy' : ''),
          title: '优化提示词',
          'aria-label': '优化提示词',
          disabled: !can,
          onClick: onOptimize,
        },
        state.loading ? '…' : '✨',
      )
    }

    function PromptOptimizePanel(props) {
      const store = props.store
      const state = useStore(store)
      const panelRef = React.useRef(null)
      const [width, setWidth] = React.useState(null)
      React.useEffect(() => {
        if (store.get().sessionId !== props.sessionId) {
          store.set({ loading: false, result: null, error: null, sessionId: props.sessionId })
        }
      }, [props.sessionId])
      React.useEffect(() => {
        if (!state.loading && !state.result && !state.error) return
        const el = panelRef.current
        if (!el) return
        const parent = el.parentElement
        const card = (parent && parent.closest) ? parent.closest('[data-composer-card]') : null
        const apply = () => {
          if (!card) {
            setWidth(680)
            return
          }
          const rect = card.getBoundingClientRect()
          setWidth(Math.round(rect.width))
        }
        apply()
        if (typeof ResizeObserver === 'undefined' || !card) return
        const observer = new ResizeObserver(apply)
        observer.observe(card)
        return () => observer.disconnect()
      }, [state.loading, state.result, state.error])
      if (!state.loading && !state.result && !state.error) return null
      const style = width ? { width: width + 'px' } : { visibility: 'hidden' }
      if (state.loading) {
        return React.createElement(
          'div',
          { ref: panelRef, className: 'prompt-optimize-panel is-loading', style: style },
          React.createElement('span', null, '正在优化提示词…'),
        )
      }
      if (state.error) {
        return React.createElement(
          'div',
          { ref: panelRef, className: 'prompt-optimize-panel is-error', style: style },
          React.createElement('span', { className: 'prompt-optimize-error-text' }, state.error),
          React.createElement(
            'button',
            { className: 'prompt-optimize-ghost', onClick: () => store.set({ error: null }) },
            '关闭',
          ),
        )
      }
      const result = state.result
      return React.createElement(
        'div',
        { ref: panelRef, className: 'prompt-optimize-panel', style: style },
        React.createElement(
          'div',
          { className: 'prompt-optimize-panel-head' },
          React.createElement('span', { className: 'prompt-optimize-title' }, '提示词优化'),
          React.createElement(
            'span',
            { className: 'prompt-optimize-panel-actions' },
            React.createElement(
              'button',
              { className: 'prompt-optimize-primary', onClick: () => {
                if (props.inputActions) props.inputActions.setDraft(result.optimized)
                store.set({ result: null })
              } },
              '应用',
            ),
            React.createElement(
              'button',
              { className: 'prompt-optimize-ghost', onClick: () => store.set({ result: null }) },
              '放弃',
            ),
          ),
        ),
        React.createElement('div', { className: 'prompt-optimize-result' }, result.optimized),
        React.createElement(
          'details',
          { className: 'prompt-optimize-orig-toggle' },
          React.createElement('summary', null, '查看原提示词'),
          React.createElement('div', { className: 'prompt-optimize-orig' }, result.original),
        ),
      )
    }

    function apply(ctx) {
      const slots = ctx.get('slots')
      if (slots === undefined) return
      const store = createStore()
      slots.inject('conversation.input.right', () => slots.register(
        { name: 'conversation.input.right', id: 'prompt-optimize', order: 0, label: '优化提示词' },
        (props) => React.createElement(PromptOptimizeButton, Object.assign({}, props, { store })),
      ))
      slots.inject('conversation.input.overlay', () => slots.register(
        { name: 'conversation.input.overlay', id: 'prompt-optimize-panel', order: 2, label: '提示词优化面板' },
        (props) => React.createElement(PromptOptimizePanel, Object.assign({}, props, { store })),
      ))
    }

    exports.apply = apply;
    exports.inject = ['slots'];

    return module.exports;
  },
});

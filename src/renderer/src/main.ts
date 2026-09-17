import './styles.css'
import './App'

document.getElementById('root')!.replaceChildren(document.createElement('wt-app'))

// Ctrl+wheel is dispatched to the page before Chromium zooms it; the main
// process pins the zoom factor, this keeps the gesture from even asking.
document.addEventListener('wheel', (e) => e.ctrlKey && e.preventDefault(), { passive: false })

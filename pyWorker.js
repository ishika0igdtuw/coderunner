// ============================================================================
// Python Execution Worker
// ============================================================================
// This worker executes Python code via Pyodide (WebAssembly-based Python).
// It runs entirely client-side without any external API calls.

let pyodideReadyPromise
let loadPyodide

// Initialize Pyodide on worker startup
pyodideReadyPromise = (async () => {
  try {
    // Load Pyodide from CDN
    importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js")
    loadPyodide = self.loadPyodide
    const pyodide = await loadPyodide()
    return pyodide
  } catch (error) {
    console.error("[v0] Pyodide initialization failed:", error.message)
    throw error
  }
})()

// Listen for code execution requests
self.onmessage = async (e) => {
  const { code } = e.data
  const logs = []

  try {
    // Wait for Pyodide to be ready
    const pyodide = await pyodideReadyPromise

    // Redirect Python print output to capture logs
    pyodide.setStdout({
      batched: (data) => logs.push(data),
    })
    pyodide.setStderr({
      batched: (data) => logs.push(data),
    })

    const result = pyodide.runPython(code)

    // Send success response
    self.postMessage({
      type: "success",
      lang: "python",
      logs,
      result: String(result ?? ""),
    })
  } catch (error) {
    // Send error response
    self.postMessage({
      type: "error",
      lang: "python",
      logs,
      error: error.toString(),
    })
  }
}

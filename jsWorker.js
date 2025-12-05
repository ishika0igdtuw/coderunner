// ============================================================================
// JavaScript Execution Worker
// ============================================================================
// This worker executes JavaScript code in a sandboxed environment.
// It captures console output and returns results via message passing.

// Listen for code execution requests
self.onmessage = (e) => {
  const { code } = e.data
  const logs = []

  const fakeConsole = {
    log: (...args) => {
      logs.push(args.map(String).join(" "))
    },
  }

  try {
    const fn = new Function("console", `"use strict";\n${code}`)
    const result = fn(fakeConsole)

    // Send success response
    self.postMessage({
      type: "success",
      lang: "javascript",
      logs,
      result: result ?? "(undefined)",
    })
  } catch (error) {
    // Send error response
    self.postMessage({
      type: "error",
      lang: "javascript",
      logs,
      error: error.message || String(error),
    })
  }
}

// ============================================================================
// Utility: Format values for display
// ============================================================================
function formatValue(value) {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

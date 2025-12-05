// ============================================================================
// Main Application - Scalable Code Runner
// ============================================================================
// This orchestrates the Monaco editor, Web Workers, and UI updates.
// It manages language selection, code execution, and output rendering.

let editor
let jsWorker
let pyWorker
let cppWorker
let monaco // Declare the monaco variable

const CONFIG = {
  monacoVersion: "0.44.0",
  defaultLanguage: "javascript",
  workerTimeout: 30000, // 30 seconds
}

// ============================================================================
// Initialize Monaco Editor
// ============================================================================
function initializeMonaco() {
  require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs" } })

  require(["vs/editor/editor.main"], () => {
    monaco = window.monaco // Assign the monaco object from window
    editor = monaco.editor.create(document.getElementById("editor"), {
      value: getDefaultCode("javascript"),
      language: "javascript",
      theme: "vs-dark",
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
      minimap: { enabled: false },
      wordWrap: "on",
      lineNumbers: "on",
      scrollBeyondLastLine: false,
    })

    // Update editor language when dropdown changes
    document.getElementById("language-select").addEventListener("change", (e) => {
      const language = e.target.value
      const model = editor.getModel()
      monaco.editor.setModelLanguage(model, getMonacoLanguage(language))
      editor.setValue(getDefaultCode(language))
    })
  })
}

// ============================================================================
// Get default code for each language
// ============================================================================
function getDefaultCode(language) {
  const defaults = {
    javascript: `// Welcome to the Code Runner!
// Select a language, write your code, and press "Run Code".

console.log("Hello from the JavaScript sandbox!");

function add(a, b) {
  return a + b;
}

console.log("2 + 3 =", add(2, 3));`,

    python: `# Welcome to the Code Runner!
# Select a language, write your code, and press "Run Code".

print("Hello from the Python sandbox!")

def add(a, b):
    return a + b

result = add(2, 3)
print(f"2 + 3 = {result}")`,

    cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;
    
    int a = 2, b = 3;
    cout << a << " + " << b << " = " << (a + b) << endl;
    
    return 0;
}`,

    java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Java execution is not yet implemented.");
        System.out.println("Java requires a JVM which cannot run in browser.");
    }
}`,
  }

  return defaults[language] || defaults.javascript
}

// ============================================================================
// Map internal language to Monaco language mode
// ============================================================================
function getMonacoLanguage(language) {
  const map = {
    javascript: "javascript",
    python: "python",
    cpp: "cpp",
    java: "java",
  }
  return map[language] || "javascript"
}

// ============================================================================
// Initialize Web Workers
// ============================================================================
function initializeWorkers() {
  jsWorker = new Worker("jsWorker.js")
  pyWorker = new Worker("pyWorker.js")
  cppWorker = new Worker("cppWorker.js") // added C++ worker initialization

  // Listen for messages from JS worker
  jsWorker.onmessage = (e) => handleWorkerResponse(e.data)
  jsWorker.onerror = (e) => handleWorkerError("JavaScript", e)

  // Listen for messages from Python worker
  pyWorker.onmessage = (e) => handleWorkerResponse(e.data)
  pyWorker.onerror = (e) => handleWorkerError("Python", e)

  cppWorker.onmessage = (e) => handleWorkerResponse(e.data)
  cppWorker.onerror = (e) => handleWorkerError("C++", e)
}

// ============================================================================
// Handle code execution
// ============================================================================
function runCode() {
  const language = document.getElementById("language-select").value
  const code = editor.getValue()
  const outputDiv = document.getElementById("output")
  const statusText = document.getElementById("status-text")

  // Clear previous output
  outputDiv.textContent = ""
  outputDiv.classList.remove("empty")

  // Update status
  statusText.textContent = "Running…"
  statusText.className = "running"
  document.getElementById("run-button").disabled = true

  // Send code to appropriate worker
  if (language === "javascript") {
    jsWorker.postMessage({ lang: "javascript", code })
  } else if (language === "python") {
    pyWorker.postMessage({ lang: "python", code })
  } else if (language === "cpp") {
    cppWorker.postMessage({ lang: "cpp", code })
  } else if (language === "java") {
    handleJavaStub()
    return
  }

    // Timeout protection
  // JS + Python ke liye 30 sec ka timeout,
  // C++ ke liye timeout mat lagao (compiler load heavy hota hai)
  if (language === "javascript" || language === "python") {
    setTimeout(() => {
      if (statusText.textContent === "Running…") {
        outputDiv.textContent = "Error: Execution timeout (30 seconds exceeded)"
        statusText.textContent = "Error ❌"
        statusText.className = "error"
        document.getElementById("run-button").disabled = false
      }
    }, CONFIG.workerTimeout)
  }
}


// ============================================================================
// Handle worker response
// ============================================================================
function handleWorkerResponse(data) {
  const outputDiv = document.getElementById("output")
  const statusText = document.getElementById("status-text")
  let output = ""

  if (data.type === "success") {
    // Display console output
    if (data.logs && data.logs.length > 0) {
      output += "Console output:\n"
      output += data.logs.join("\n")
      output += "\n\n"
    }

    // Display execution result
    output += "Execution result:\n"
    if (data.result !== undefined && data.result !== null) {
      output += String(data.result)
    } else {
      output += "(undefined)"
    }

    outputDiv.textContent = output
    statusText.textContent = "Done ✅"
    statusText.className = "success"
  } else if (data.type === "error") {
    // Display console output (if any)
    if (data.logs && data.logs.length > 0) {
      output += "Console output:\n"
      output += data.logs.join("\n")
      output += "\n\n"
    }

    // Display error
    output += "Error:\n"
    output += data.error

    outputDiv.textContent = output
    statusText.textContent = "Error ❌"
    statusText.className = "error"
  }

  document.getElementById("run-button").disabled = false
}

// ============================================================================
// Handle worker error
// ============================================================================
function handleWorkerError(workerName, error) {
  const outputDiv = document.getElementById("output")
  const statusText = document.getElementById("status-text")

  outputDiv.textContent = `Worker Error (${workerName}):\n${error.message}`
  statusText.textContent = "Error ❌"
  statusText.className = "error"
  document.getElementById("run-button").disabled = false
}

// ============================================================================
// Handle Java stub (not implemented)
// ============================================================================
function handleJavaStub() {
  const outputDiv = document.getElementById("output")
  const statusText = document.getElementById("status-text")

  const message = `[JAVA – NOT IMPLEMENTED]
Java execution requires a JVM or WASM-compiled JDK.
This prototype focuses on JS, Python, and C++ real execution.

Architectural note:
In a full system, Java would run in an isolated JVM instance
or be compiled to WebAssembly with containerized execution
and resource constraints (CPU, memory, I/O) enforced.`

  outputDiv.textContent = message
  statusText.textContent = "Stub only"
  statusText.className = "stub"
  document.getElementById("run-button").disabled = false
}

// ============================================================================
// Event Listeners
// ============================================================================
document.getElementById("run-button").addEventListener("click", runCode)

// Allow Ctrl+Enter to run code
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    runCode()
  }
})

// ============================================================================
// Initialize app on load
// ============================================================================
window.addEventListener("DOMContentLoaded", () => {
  initializeMonaco()
  initializeWorkers()
})

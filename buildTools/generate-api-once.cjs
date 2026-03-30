const { spawn } = require('child_process')
const path = require('path')
const { loadOpenApiConfig } = require('./openapi-config.cjs')

const config = loadOpenApiConfig()
const generateApiScript = path.resolve(__dirname, 'generate-api.cjs')
const hagicodeCoreDir = path.resolve(__dirname, '../../hagicode-core')
const swaggerHostProject = path.join('src', 'PCode.SwaggerHost', 'PCode.SwaggerHost.csproj')
const startupTimeoutMs = 120000
const pollIntervalMs = 1000
const logTailLimit = 80

function appendLog(logLines, chunk) {
  const lines = chunk
    .toString()
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(Boolean)

  if (lines.length === 0) return
  logLines.push(...lines)
  if (logLines.length > logTailLimit) {
    logLines.splice(0, logLines.length - logTailLimit)
  }
}

async function isSwaggerReady(swaggerUrl) {
  try {
    const response = await fetch(swaggerUrl, { method: 'GET' })
    return response.ok
  } catch {
    return false
  }
}

async function waitForSwagger(swaggerUrl, childProcess, logLines) {
  const deadline = Date.now() + startupTimeoutMs

  while (Date.now() < deadline) {
    if (await isSwaggerReady(swaggerUrl)) {
      return
    }

    if (childProcess.exitCode !== null) {
      const logTail = logLines.length > 0 ? `\n${logLines.join('\n')}` : ''
      throw new Error(`Standalone Swagger host exited before becoming ready.${logTail}`)
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }

  const logTail = logLines.length > 0 ? `\n${logLines.join('\n')}` : ''
  throw new Error(`Timed out waiting for standalone Swagger host at ${swaggerUrl}.${logTail}`)
}

async function stopChildProcess(childProcess) {
  if (!childProcess || childProcess.exitCode !== null) return

  await new Promise(resolve => {
    const timeout = setTimeout(() => {
      if (childProcess.exitCode === null) {
        childProcess.kill('SIGKILL')
      }
    }, 5000)

    childProcess.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })

    childProcess.kill('SIGTERM')
  })
}

async function main() {
  const swaggerUrl = new URL(config.swaggerUrl)

  if (!['http:', 'https:'].includes(swaggerUrl.protocol)) {
    throw new Error(`generate:api:once only supports HTTP(S) Swagger inputs, got: ${config.swaggerUrl}`)
  }

  const swaggerAlreadyRunning = await isSwaggerReady(swaggerUrl)
  let childProcess = null
  const logLines = []

  try {
    if (swaggerAlreadyRunning) {
      console.log(`[generate:api:once] Reusing existing Swagger host at ${swaggerUrl}`)
    } else {
      console.log(`[generate:api:once] Starting standalone Swagger host from ${hagicodeCoreDir}`)

      childProcess = spawn(
        'dotnet',
        ['run', '--no-launch-profile', '--project', swaggerHostProject],
        {
          cwd: hagicodeCoreDir,
          env: {
            ...process.env,
            ASPNETCORE_ENVIRONMENT: process.env.ASPNETCORE_ENVIRONMENT || 'Development',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      )

      childProcess.stdout.on('data', chunk => appendLog(logLines, chunk))
      childProcess.stderr.on('data', chunk => appendLog(logLines, chunk))
      childProcess.on('error', error => {
        appendLog(logLines, `[spawn-error] ${error.message}`)
      })

      await waitForSwagger(swaggerUrl, childProcess, logLines)
      console.log(`[generate:api:once] Swagger host is ready at ${swaggerUrl}`)
    }

    const generateResult = await new Promise(resolve => {
      const scriptProcess = spawn(process.execPath, [generateApiScript], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        env: process.env,
      })

      scriptProcess.on('exit', code => resolve(code ?? 1))
      scriptProcess.on('error', () => resolve(1))
    })

    process.exitCode = generateResult
  } finally {
    if (childProcess) {
      console.log('[generate:api:once] Stopping standalone Swagger host')
      await stopChildProcess(childProcess)
    }
  }
}

main().catch(error => {
  console.error(`[generate:api:once] ${error.message}`)
  process.exit(1)
})

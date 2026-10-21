import { parseArgs } from 'node:util'

import { EXIT_CODE, HELP, USAGE_ERRORS } from './constants.js'
import { CollectorError } from './error.js'
import { runPresidentialDemo } from './president/demo.js'
import { publishResultCapture } from './president/publish.js'
import { publishSnapshot } from './publication/publish.js'
import { readPublication } from './publication/read.js'
import { listSnapshots } from './publication/storage.js'
import { runTseOnce, runTseReplay } from './tse/run.js'
import { publishUfSummary } from './tse/summary.js'
import { watchTse } from './tse/watch.js'

type Options = Partial<
  Record<
    | 'out'
    | 'channel'
    | 'input'
    | 'source'
    | 'round'
    | 'election'
    | 'output'
    | 'capture'
    | 'office'
    | 'scope'
    | 'publications'
    | 'channel-prefix'
    | 'interval-ms'
    | 'prefix',
    string
  >
>

function requireOptions<K extends keyof Options>(
  options: Options,
  ...names: K[]
) {
  const missing = names.filter((name) => !options[name])
  if (missing.length > 0) {
    throw new CollectorError(
      'MISSING_OPTIONS',
      missing.map((name) => `--${name}`).join(', '),
    )
  }
  return options as Required<Pick<Options, K>>
}

function parseCommandLine(argv: string[]) {
  try {
    return parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        out: { type: 'string' },
        channel: { type: 'string' },
        input: { type: 'string' },
        source: { type: 'string' },
        round: { type: 'string' },
        election: { type: 'string' },
        output: { type: 'string' },
        capture: { type: 'string' },
        office: { type: 'string' },
        scope: { type: 'string' },
        publications: { type: 'string' },
        'channel-prefix': { type: 'string' },
        'interval-ms': { type: 'string' },
        once: { type: 'boolean' },
        prefix: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    })
  } catch (error) {
    throw new CollectorError('INVALID_ARGUMENTS', (error as Error).message)
  }
}

const commands = {
  publish: async (options: Options) => {
    const { out, channel, input } = requireOptions(
      options,
      'out',
      'channel',
      'input',
    )
    return publishSnapshot({ root: out, channel, inputPath: input })
  },
  inspect: async (options: Options) => {
    const { out, channel } = requireOptions(options, 'out', 'channel')
    const publication = await readPublication(out, channel)
    return {
      ...publication,
      history: await listSnapshots(publication.channelDirectory),
    }
  },
  'president-publish': async (options: Options) => {
    const { capture, output, channel } = requireOptions(
      options,
      'capture',
      'output',
      'channel',
    )
    return publishResultCapture({ capture, output, channel })
  },
  'president-demo': (options: Options) => runPresidentialDemo(options.output),
  'tse-once': async (options: Options) => {
    const { source, round, output } = requireOptions(
      options,
      'source',
      'round',
      'output',
    )
    return runTseOnce({
      source,
      round,
      output,
      ...(options.election !== undefined && { election: options.election }),
      ...(options.office !== undefined && { office: options.office }),
      ...(options.scope !== undefined && { scope: options.scope }),
    })
  },
  'tse-watch': async (options: Options & { once?: boolean }) => {
    const { source, round, output, publications } = requireOptions(
      options,
      'source',
      'round',
      'output',
      'publications',
    )
    const rawIntervalMs = options['interval-ms']
    const channelPrefix = options['channel-prefix']
    if (
      rawIntervalMs !== undefined &&
      (!/^[1-9]\d*$/.test(rawIntervalMs) ||
        !Number.isSafeInteger(Number(rawIntervalMs)))
    ) {
      throw new CollectorError(
        'INVALID_ARGUMENTS',
        '--interval-ms precisa ser um inteiro positivo',
      )
    }
    const controller = new AbortController()
    const stop = () => controller.abort()
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    try {
      return await watchTse({
        source,
        round,
        output,
        publications,
        ...(channelPrefix !== undefined && { channelPrefix }),
        ...(rawIntervalMs !== undefined && {
          intervalMs: Number(rawIntervalMs),
        }),
        ...(options.once && { maxCycles: 1 }),
        signal: controller.signal,
        log: (event) =>
          console.log(
            JSON.stringify({ at: new Date().toISOString(), ...event }),
          ),
      })
    } finally {
      process.off('SIGINT', stop)
      process.off('SIGTERM', stop)
    }
  },
  'summary-publish': async (options: Options) => {
    const { publications, prefix, round } = requireOptions(
      options,
      'publications',
      'prefix',
      'round',
    )
    if (round !== '1' && round !== '2') {
      throw new CollectorError('INVALID_ROUND', round)
    }
    return publishUfSummary({ publications, prefix, round: Number(round) })
  },
  'tse-replay': async (options: Options) => {
    const { input, output } = requireOptions(options, 'input', 'output')
    return runTseReplay({ input, output })
  },
}

export async function runCli(
  argv: string[],
  print = console.log,
  printError = console.error,
) {
  try {
    const { values, positionals } = parseCommandLine(argv)
    const [name] = positionals
    if (values.help || name === undefined) {
      print(HELP)
      return EXIT_CODE.success
    }
    if (!Object.hasOwn(commands, name)) {
      throw new CollectorError('UNKNOWN_COMMAND', name)
    }
    const result = await commands[name as keyof typeof commands](values)
    print(JSON.stringify(result, null, 2))
    return EXIT_CODE.success
  } catch (error) {
    if (!(error instanceof CollectorError)) {
      printError(String(error))
      return EXIT_CODE.failure
    }
    printError(`${error.code}: ${error.message}`)
    return USAGE_ERRORS.includes(error.code)
      ? EXIT_CODE.usage
      : EXIT_CODE.failure
  }
}

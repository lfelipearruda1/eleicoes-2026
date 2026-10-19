import { parseArgs } from 'node:util'

import { EXIT_CODE, HELP, USAGE_ERRORS } from './constants.js'
import { runDemo } from './demo.js'
import { CollectorError } from './error.js'
import { publishSnapshot } from './publication/publish.js'
import { readPublication } from './publication/read.js'
import { listSnapshots } from './publication/storage.js'
import { runTseOnce, runTseReplay } from './tse/run.js'

type Options = Partial<
  Record<
    'out' | 'channel' | 'input' | 'source' | 'round' | 'election' | 'output',
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
  demo: (options: Options) => runDemo(options.out),
  'tse-once': async (options: Options) => {
    const { source, round, output } = requireOptions(
      options,
      'source',
      'round',
      'output',
    )
    return runTseOnce({ source, round, output, election: options.election })
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

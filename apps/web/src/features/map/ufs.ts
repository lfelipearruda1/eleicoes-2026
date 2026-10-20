import brazilMap from './brazil-map.json'

export const REGIONS = {
  norte: 'Norte',
  nordeste: 'Nordeste',
  'centro-oeste': 'Centro-Oeste',
  sudeste: 'Sudeste',
  sul: 'Sul',
} as const

export interface Uf {
  code: string
  name: string
  region: keyof typeof REGIONS
}

export const UFS: readonly Uf[] = [
  { code: 'AC', name: 'Acre', region: 'norte' },
  { code: 'AL', name: 'Alagoas', region: 'nordeste' },
  { code: 'AP', name: 'Amapá', region: 'norte' },
  { code: 'AM', name: 'Amazonas', region: 'norte' },
  { code: 'BA', name: 'Bahia', region: 'nordeste' },
  { code: 'CE', name: 'Ceará', region: 'nordeste' },
  { code: 'DF', name: 'Distrito Federal', region: 'centro-oeste' },
  { code: 'ES', name: 'Espírito Santo', region: 'sudeste' },
  { code: 'GO', name: 'Goiás', region: 'centro-oeste' },
  { code: 'MA', name: 'Maranhão', region: 'nordeste' },
  { code: 'MT', name: 'Mato Grosso', region: 'centro-oeste' },
  { code: 'MS', name: 'Mato Grosso do Sul', region: 'centro-oeste' },
  { code: 'MG', name: 'Minas Gerais', region: 'sudeste' },
  { code: 'PA', name: 'Pará', region: 'norte' },
  { code: 'PB', name: 'Paraíba', region: 'nordeste' },
  { code: 'PR', name: 'Paraná', region: 'sul' },
  { code: 'PE', name: 'Pernambuco', region: 'nordeste' },
  { code: 'PI', name: 'Piauí', region: 'nordeste' },
  { code: 'RJ', name: 'Rio de Janeiro', region: 'sudeste' },
  { code: 'RN', name: 'Rio Grande do Norte', region: 'nordeste' },
  { code: 'RS', name: 'Rio Grande do Sul', region: 'sul' },
  { code: 'RO', name: 'Rondônia', region: 'norte' },
  { code: 'RR', name: 'Roraima', region: 'norte' },
  { code: 'SC', name: 'Santa Catarina', region: 'sul' },
  { code: 'SP', name: 'São Paulo', region: 'sudeste' },
  { code: 'SE', name: 'Sergipe', region: 'nordeste' },
  { code: 'TO', name: 'Tocantins', region: 'norte' },
]

export const findUf = (code: string | undefined) =>
  UFS.find((uf) => uf.code === code)

export const CALLOUTS: Readonly<Record<string, readonly [number, number]>> = {
  RN: [1012, 270],
  PB: [1020, 318],
  AL: [1006, 390],
  SE: [988, 438],
  ES: [905, 682],
  RJ: [838, 778],
  DF: [738, 518],
}

export const MAP_GEOMETRY: Readonly<
  Record<string, { d: string; cx: number; cy: number }>
> = brazilMap.uf

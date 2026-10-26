# Identidade visual Gerencial

Este aplicativo usa a identidade oficial da Gerencial (gerencialcond.com.br), **sem redesenho**:

- `gerencial-logo.png` — logo horizontal oficial (texto branco + ouro), usado no cabeçalho do
  site e no documento do Mapa de Cotação, sempre sobre o azul-marinho institucional.
- `gerencial-simbolo.png` — símbolo oficial, usado como favicon/ícone do app.

## Cores oficiais

| Token          | Valor     | Uso                                        |
| -------------- | --------- | ------------------------------------------ |
| `--color-ink`  | `#181447` | azul-marinho institucional (fundos escuros)|
| `--color-brand`| `#FAB12A` | ouro Gerencial (destaques, botões)         |
| `--color-brand-dark` | `#8A5C00` | ouro escuro (textos pequenos sobre claro) |
| `--color-success` | `#0E4828` | verde institucional (melhor preço, êxito) |
| `--color-paper`| `#F6F4EE` | fundo das telas                            |
| `--color-line` | `#E3E0D3` | linhas e bordas                            |

## Tipografia

Arial (a mesma do site institucional), com títulos em negrito. Sem fontes externas: o app
carrega mais rápido e funciona até offline na intranet.

## Regra do logo

O logo oficial tem texto branco: **nunca o exiba sobre fundo branco**. O componente
`BrandLogo` já cuida disso — usa placa azul-marinho (`treatment="plate"`, padrão) ou é
posicionado sobre faixas escuras (`treatment="bare"`).

Para trocar o arquivo do logo, substitua `gerencial-logo.png` mantendo o mesmo nome.

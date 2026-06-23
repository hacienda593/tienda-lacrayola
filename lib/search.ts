import { Producto } from './types'

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99
  const tmp: number[][] = []
  let i: number, j: number
  for (i = 0; i <= a.length; i++) {
    tmp[i] = [i]
  }
  for (j = 0; j <= b.length; j++) {
    tmp[0][j] = j
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return tmp[a.length][b.length]
}

export function customSearch(products: Producto[], queryText: string): Producto[] {
  const query = queryText.toLowerCase().trim()
  if (!query) return products

  const qWords = query.split(/\s+/)
  const results: { item: Producto; score: number }[] = []

  for (const p of products) {
    const descLower = (p.descripcion || '').toLowerCase()
    const brandLower = (p.marca || '').toLowerCase()
    const catLower = (p.categoria || '').toLowerCase()
    const codeLower = (p.codigo || '').toLowerCase()

    let matchesAll = true
    let totalScore = 0

    for (const qw of qWords) {
      let wordMatched = false
      let bestWordScore = 1

      // 1. Exact substring check in description, brand, category, or code
      if (descLower.includes(qw)) {
        wordMatched = true
        bestWordScore = Math.min(bestWordScore, 0.1)
      }
      if (brandLower.includes(qw) || catLower.includes(qw) || codeLower.includes(qw)) {
        wordMatched = true
        bestWordScore = Math.min(bestWordScore, 0.2)
      }

      // 2. Word-level prefix and typo matching
      const prodWords = descLower.split(/[\s,./()\-+]+/).concat(brandLower.split(/[\s,./()\-+]+/))
      
      for (const pw of prodWords) {
        if (!pw) continue
        
        // Exact match
        if (pw === qw) {
          wordMatched = true
          bestWordScore = Math.min(bestWordScore, 0.0)
          break
        }
        
        // Prefix match
        if (pw.startsWith(qw) && qw.length >= 3) {
          wordMatched = true
          bestWordScore = Math.min(bestWordScore, 0.05 + (0.05 * (pw.length - qw.length) / pw.length))
        }

        // Typo tolerance
        const maxDist = qw.length <= 3 ? 0 : 1
        if (qw.length >= 3) {
          const dist = levenshtein(qw, pw)
          if (dist <= maxDist) {
            wordMatched = true
            const score = 0.15 + (0.2 * dist / maxDist)
            bestWordScore = Math.min(bestWordScore, score)
          }
        }
      }

      if (!wordMatched) {
        matchesAll = false
        break
      }
      totalScore += bestWordScore
    }

    if (matchesAll) {
      results.push({
        item: p,
        score: totalScore / qWords.length
      })
    }
  }

  return results.sort((a, b) => a.score - b.score).map(r => r.item)
}

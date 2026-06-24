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

function obtenerAlternativas(word: string): string[] {
  const alts = [word]
  if (word.length > 3) {
    if (word.endsWith('es')) {
      alts.push(word.slice(0, -2)) // ej: "panes" -> "pan"
    } else if (word.endsWith('s')) {
      alts.push(word.slice(0, -1)) // ej: "leches" -> "leche"
    } else {
      // Inverso: agregar plural tentativo
      if (['a', 'e', 'i', 'o', 'u'].includes(word.slice(-1))) {
        alts.push(word + 's')
      } else {
        alts.push(word + 'es')
      }
    }
  }
  return alts
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

    // Dividimos las palabras de la descripción y marca para verificar la posición exacta
    const prodWords = descLower.split(/[\s,./()\-+]+/).concat(brandLower.split(/[\s,./()\-+]+/))

    for (const qw of qWords) {
      let wordMatched = false
      let bestWordScore = 1

      // Obtenemos alternativas gramaticales de la palabra buscada (singular/plural)
      const qwAlts = obtenerAlternativas(qw)

      for (const qwa of qwAlts) {
        let currentAltScore = 1
        const altPenalty = qwa === qw ? 0 : 0.02 // Leve penalidad si es coincidencia por alternativa plural/singular

        // 1. Coincidencia de subcadena exacta
        if (descLower.includes(qwa)) {
          wordMatched = true
          currentAltScore = Math.min(currentAltScore, 0.1 + altPenalty)
        }
        if (brandLower.includes(qwa) || catLower.includes(qwa) || codeLower.includes(qwa)) {
          wordMatched = true
          currentAltScore = Math.min(currentAltScore, 0.2 + altPenalty)
        }

        // 2. Coincidencia a nivel de palabra con penalización por posición (Index Penalty)
        for (let idx = 0; idx < prodWords.length; idx++) {
          const pw = prodWords[idx]
          if (!pw) continue

          const posPenalty = idx * 0.005 // 0.005 de penalización por palabra de distancia

          // Coincidencia exacta de palabra
          if (pw === qwa) {
            wordMatched = true
            currentAltScore = Math.min(currentAltScore, 0.0 + posPenalty + altPenalty)
          }

          // Coincidencia de prefijo
          if (pw.startsWith(qwa) && qwa.length >= 3) {
            wordMatched = true
            currentAltScore = Math.min(currentAltScore, 0.05 + (0.05 * (pw.length - qwa.length) / pw.length) + posPenalty + altPenalty)
          }

          // Tolerancia a errores tipográficos (Levenshtein)
          const maxDist = qwa.length <= 3 ? 0 : 1
          if (qwa.length >= 3) {
            const dist = levenshtein(qwa, pw)
            if (dist <= maxDist) {
              wordMatched = true
              const score = 0.15 + (0.2 * dist / maxDist) + posPenalty + altPenalty
              currentAltScore = Math.min(currentAltScore, score)
            }
          }
        }

        bestWordScore = Math.min(bestWordScore, currentAltScore)
      }

      if (!wordMatched) {
        matchesAll = false
        break
      }
      totalScore += bestWordScore
    }

    if (matchesAll) {
      let finalScore = totalScore / qWords.length

      // Impulso de inicio directo (Starts-with Boost)
      if (descLower.startsWith(query)) {
        finalScore -= 0.15 // Gran beneficio si el título empieza exactamente con la búsqueda
      } else {
        const firstWord = prodWords[0]
        if (firstWord && qWords.some(qw => firstWord.startsWith(qw))) {
          finalScore -= 0.05 // Beneficio menor si la primera palabra coincide parcialmente
        }
      }

      results.push({
        item: p,
        score: finalScore
      })
    }
  }

  // Ordenar de menor score (más relevante) a mayor score
  return results.sort((a, b) => a.score - b.score).map(r => r.item)
}

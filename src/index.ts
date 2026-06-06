// Point d'entrée de l'API StageConnect.
// dotenv DOIT être importé en premier (les autres modules lisent process.env).
import 'dotenv/config'
import app from './app'

// `|| 3001` (et non `?? 3001`) : couvre aussi PORT vide ou non numérique (Number('') === 0)
const PORT = Number(process.env.PORT) || 3001
app.listen(PORT, () => {
  console.log(`✅ API StageConnect démarrée sur http://localhost:${PORT}`)
})

// Point d'entrée de l'API StageConnect.
// dotenv DOIT être importé en premier (les autres modules lisent process.env).
import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

import adminRoutes from './routes/admin.routes'
import applicationsRoutes from './routes/applications.routes'
import authRoutes from './routes/auth.routes'
import companiesRoutes from './routes/companies.routes'
import jobsRoutes from './routes/jobs.routes'
import messagesRoutes from './routes/messages.routes'
import studentsRoutes from './routes/students.routes'

import { errorHandler, notFound } from './middlewares/error.middleware'

const app = express()

// Headers de sécurité HTTP (X-Content-Type-Options, HSTS, etc.)
app.use(helmet())

// CORS restreint à l'origine du front uniquement (CLIENT_URL)
// `||` et non `??` : couvre aussi la variable définie mais vide
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
)
app.use(express.json())

// Anti brute-force sur le login : 5 tentatives max par IP toutes les 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  // Réponse au format d'erreur standard de l'API
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
      code: 429,
    })
  },
})
app.use('/api/auth/login', loginLimiter)

// Health check — utilisé par Render et pour vérifier que l'API tourne
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' }, message: 'API opérationnelle' })
})

app.use('/api/auth', authRoutes)
app.use('/api/students', studentsRoutes)
app.use('/api/companies', companiesRoutes)
app.use('/api/jobs', jobsRoutes)
app.use('/api/applications', applicationsRoutes)
app.use('/api/messages', messagesRoutes)
app.use('/api/admin', adminRoutes)

// 404 puis gestion d'erreur centralisée — toujours en dernier
app.use(notFound)
app.use(errorHandler)

// `|| 3001` (et non `?? 3001`) : couvre aussi PORT vide ou non numérique (Number('') === 0)
const PORT = Number(process.env.PORT) || 3001
app.listen(PORT, () => {
  console.log(`✅ API StageConnect démarrée sur http://localhost:${PORT}`)
})

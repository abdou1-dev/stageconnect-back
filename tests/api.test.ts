// Suite de tests API — vitest + supertest sur l'app Express (sans port).
// Tests d'intégration contre la base réelle : les comptes créés utilisent
// le préfixe « apitest. » et sont supprimés en fin de suite (afterAll).
import 'dotenv/config'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import app from '../src/app'
import { prisma } from '../src/lib/prisma'

const stamp = `${Date.now()}`
const STUDENT_A = { email: `apitest.a.${stamp}@test.local`, password: 'motdepasse123', role: 'STUDENT', firstName: 'Test', lastName: 'Alpha' }
const STUDENT_B = { email: `apitest.b.${stamp}@test.local`, password: 'motdepasse123', role: 'STUDENT', firstName: 'Test', lastName: 'Bravo' }

let tokenA = ''
let userIdA = ''
let studentIdA = ''
let studentIdB = ''

beforeAll(async () => {
  // Deux étudiants de test : A (acteur) et B (cible des tests d'ownership)
  const a = await request(app).post('/api/auth/register').send(STUDENT_A)
  tokenA = a.body.data.token
  userIdA = a.body.data.user.id
  studentIdA = a.body.data.user.student.id

  const b = await request(app).post('/api/auth/register').send(STUDENT_B)
  studentIdB = b.body.data.user.student.id
})

afterAll(async () => {
  // Nettoyage : messages éventuels puis comptes de test
  const testUsers = await prisma.user.findMany({
    where: { email: { contains: 'apitest.' } },
    select: { id: true },
  })
  const ids = testUsers.map((u) => u.id)
  await prisma.message.deleteMany({
    where: { OR: [{ senderId: { in: ids } }, { receiverId: { in: ids } }] },
  })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})

describe('Santé et format des réponses', () => {
  it('GET /api/health → 200 au format { success, data, message }', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok' } })
    expect(typeof res.body.message).toBe('string')
  })

  it('route inconnue → 404 au format { success: false, error, code }', async () => {
    const res = await request(app).get('/api/inconnu')
    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ success: false, code: 404 })
    expect(typeof res.body.error).toBe('string')
  })
})

describe('Inscription (POST /auth/register)', () => {
  it('refuse une requête sans champs requis (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@y.z' })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('refuse un rôle invalide (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `apitest.r.${stamp}@test.local`, password: 'motdepasse123', role: 'ADMIN' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Rôle invalide')
  })

  it('refuse un mot de passe trop court (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `apitest.p.${stamp}@test.local`, password: 'court', role: 'STUDENT', firstName: 'A', lastName: 'B' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('8 caractères')
  })

  it('crée un compte étudiant (201) sans jamais renvoyer le password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `apitest.c.${stamp}@test.local`, password: 'motdepasse123', role: 'STUDENT', firstName: 'Charlie', lastName: 'Test' })
    expect(res.status).toBe(201)
    expect(res.body.data.token).toBeTruthy()
    expect(res.body.data.user.password).toBeUndefined()
    expect(res.body.data.user.student.firstName).toBe('Charlie')
  })

  it('refuse un email déjà utilisé (409)', async () => {
    const res = await request(app).post('/api/auth/register').send(STUDENT_A)
    expect(res.status).toBe(409)
    expect(res.body.error).toContain('déjà utilisé')
  })
})

describe('Connexion (POST /auth/login)', () => {
  it('refuse un mauvais mot de passe (401, message volontairement vague)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: STUDENT_A.email, password: 'mauvais-mdp' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Email ou mot de passe incorrect')
  })

  it('connecte un utilisateur valide (200) et renvoie un token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: STUDENT_A.email, password: STUDENT_A.password })
    expect(res.status).toBe(200)
    expect(res.body.data.token).toBeTruthy()
    expect(res.body.data.user.password).toBeUndefined()
  })
})

describe('Session (GET /auth/me)', () => {
  it('refuse sans token (401)', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('refuse un token invalide (401)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-bidon')
    expect(res.status).toBe(401)
  })

  it('renvoie le profil du porteur du token (200)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe(STUDENT_A.email)
    expect(res.body.data.status).toBe('ACTIVE')
  })
})

describe('Offres (rôles et accès)', () => {
  it('GET /jobs est public et paginé', async () => {
    const res = await request(app).get('/api/jobs?limit=5')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data.jobs)).toBe(true)
    expect(typeof res.body.data.total).toBe('number')
  })

  it('refuse la création d’offre sans authentification (401)', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .send({ title: 'x', description: 'y', type: 'STAGE' })
    expect(res.status).toBe(401)
  })

  it('refuse la création d’offre à un étudiant (403 — rôle COMPANY requis)', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'x', description: 'y', type: 'STAGE' })
    expect(res.status).toBe(403)
  })
})

describe('Ownership et intégrité', () => {
  it('refuse la modification du profil d’un autre étudiant (403)', async () => {
    const res = await request(app)
      .put(`/api/students/${studentIdB}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ bio: 'tentative de piratage' })
    expect(res.status).toBe(403)
  })

  it('annulation d’une candidature inexistante → 404', async () => {
    const res = await request(app)
      .delete('/api/applications/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(404)
  })

  it('refuse un message à soi-même (400)', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ receiverId: userIdA, content: 'coucou moi-même' })
    expect(res.status).toBe(400)
  })

  it('refuse un message vide (400)', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ receiverId: '00000000-0000-0000-0000-000000000000', content: '   ' })
    expect(res.status).toBe(400)
  })
})

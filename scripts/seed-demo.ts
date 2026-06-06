// Prépare la base pour l'évaluation du jury :
//   1. Supprime les comptes de test techniques (test.claude.*, demo.prod.*, …)
//   2. Crée un jeu de données de démo réaliste (entreprises, offres, étudiants,
//      candidatures, conversations) — idempotent (upsert par email).
//
// Exécution :  $env:DEMO_PASSWORD='...'; npx ts-node scripts/seed-demo.ts
// Le mot de passe des comptes de démo passe par variable d'env, jamais en dur.
import 'dotenv/config'
import bcrypt from 'bcrypt'

import { prisma } from '../src/lib/prisma'

const TEST_PATTERNS = ['test.claude.', 'demo.prod.', 'entreprise.claude.', 'test@test.sn', 'a@b.sn']

async function cleanup(): Promise<void> {
  const testUsers = await prisma.user.findMany({
    where: { OR: TEST_PATTERNS.map((p) => ({ email: { contains: p } })) },
    select: { id: true, email: true },
  })
  if (testUsers.length === 0) {
    console.log('· Aucun compte de test à nettoyer')
    return
  }
  const ids = testUsers.map((u) => u.id)
  // Les messages n'ont pas de cascade : on les supprime d'abord
  await prisma.message.deleteMany({
    where: { OR: [{ senderId: { in: ids } }, { receiverId: { in: ids } }] },
  })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  console.log(`· ${testUsers.length} comptes de test supprimés : ${testUsers.map((u) => u.email).join(', ')}`)
}

interface CompanySeed {
  email: string
  name: string
  secteur: string
  ville: string
  description: string
  website?: string
}

interface StudentSeed {
  email: string
  firstName: string
  lastName: string
  ville: string
  bio: string
  skills: string[]
}

const COMPANIES: CompanySeed[] = [
  { email: 'entreprise.demo@stageconnect.sn', name: 'InnovTech Dakar', secteur: 'Informatique', ville: 'Dakar', description: 'ESN sénégalaise spécialisée dans les solutions web et mobiles pour les PME ouest-africaines. Équipe jeune, encadrement rapproché des stagiaires, locaux aux Almadies.', website: 'https://stageconnect-front.vercel.app' },
  { email: 'rh@sonatel-demo.sn', name: 'Sonatel', secteur: 'Télécoms', ville: 'Dakar', description: 'Premier opérateur de télécommunications du Sénégal. Programme structuré d\'accueil de stagiaires et d\'alternants dans les métiers techniques et data.' },
  { email: 'recrutement@wave-demo.sn', name: 'Wave Mobile Money', secteur: 'Fintech', ville: 'Dakar', description: 'La fintech qui révolutionne le paiement mobile en Afrique de l\'Ouest. Environnement international, projets à fort impact.' },
  { email: 'jobs@baamtu-demo.sn', name: 'Baamtu', secteur: 'Data & IA', ville: 'Dakar', description: 'Cabinet sénégalais expert en data science, IA et transformation digitale. Mentorat technique de haut niveau pour les profils data.' },
  { email: 'contact@volkeno-demo.sn', name: 'Volkeno', secteur: 'Informatique', ville: 'Thiès', description: 'Studio de développement et école de formation aux métiers du numérique. Stages très formateurs orientés pratique.' },
]

const STUDENTS: StudentSeed[] = [
  { email: 'etudiant.demo@stageconnect.sn', firstName: 'Aïssatou', lastName: 'Fall', ville: 'Dakar', bio: 'Étudiante en L3 Informatique à l\'UNCHK, passionnée de développement web. Je recherche un stage de fin d\'études en développement fullstack à partir de juillet 2026.', skills: ['React', 'Next.js', 'Node.js', 'PostgreSQL', 'Git'] },
  { email: 'moussa.diop.demo@unchk.sn', firstName: 'Moussa', lastName: 'Diop', ville: 'Thiès', bio: 'L3 IDA, intéressé par la data et les statistiques appliquées.', skills: ['Python', 'SQL', 'Power BI'] },
  { email: 'khady.sarr.demo@unchk.sn', firstName: 'Khady', lastName: 'Sarr', ville: 'Saint-Louis', bio: 'Développeuse mobile junior, deux applications Flutter publiées.', skills: ['Flutter', 'Dart', 'Firebase'] },
  { email: 'ibrahima.ba.demo@unchk.sn', firstName: 'Ibrahima', lastName: 'Ba', ville: 'Dakar', bio: 'Futur administrateur systèmes — labs Linux et réseaux à mon actif.', skills: ['Linux', 'Docker', 'Réseaux'] },
]

// [companyIndex, title, type, ville, secteur, duration?, salary?]
const JOBS: [number, string, 'STAGE' | 'ALTERNANCE' | 'CDI' | 'CDD' | 'FREELANCE', string, string, string?, string?][] = [
  [0, 'Développeur Fullstack Junior (React/Node)', 'STAGE', 'Dakar', 'Informatique', '6 mois', '150 000 FCFA/mois'],
  [0, 'Stagiaire UI/UX Designer', 'STAGE', 'Dakar', 'Design', '4 mois', '100 000 FCFA/mois'],
  [0, 'Développeur Mobile Flutter', 'CDD', 'Dakar', 'Informatique', '12 mois', '450 000 FCFA/mois'],
  [1, 'Ingénieur DevOps Junior', 'CDI', 'Dakar', 'Télécoms', undefined, 'Selon profil'],
  [1, 'Alternance Data Engineering', 'ALTERNANCE', 'Dakar', 'Data & IA', '12 mois', '200 000 FCFA/mois'],
  [1, 'Stage Cybersécurité SOC', 'STAGE', 'Dakar', 'Sécurité', '6 mois', '175 000 FCFA/mois'],
  [2, 'Backend Engineer (Python)', 'CDI', 'Dakar', 'Fintech', undefined, 'Compétitif + equity'],
  [2, 'Stage Data Analyst Paiements', 'STAGE', 'Dakar', 'Fintech', '6 mois', '200 000 FCFA/mois'],
  [3, 'Stagiaire Data Scientist', 'STAGE', 'Dakar', 'Data & IA', '6 mois', '150 000 FCFA/mois'],
  [3, 'Consultant BI Junior', 'CDD', 'Dakar', 'Data & IA', '9 mois', '400 000 FCFA/mois'],
  [4, 'Stage Développement Web (PHP/Laravel)', 'STAGE', 'Thiès', 'Informatique', '5 mois', '90 000 FCFA/mois'],
  [4, 'Formateur assistant JavaScript', 'FREELANCE', 'Thiès', 'Formation', undefined, '15 000 FCFA/jour'],
  [4, 'Alternance Community & Tech', 'ALTERNANCE', 'Thiès', 'Communication', '12 mois', '120 000 FCFA/mois'],
]

function jobDescription(title: string, company: string): string {
  return `${company} recherche : ${title}.\n\nVos missions :\n• Participer aux projets clients au sein d'une équipe encadrée\n• Contribuer à la conception, au développement et aux tests\n• Documenter votre travail et présenter vos résultats\n\nProfil recherché :\n• Étudiant(e) ou jeune diplômé(e) en informatique ou équivalent\n• Curiosité, rigueur et envie d'apprendre\n• La connaissance du contexte sénégalais est un plus\n\nCandidature : CV + lettre de motivation via StageConnect.`
}

async function seed(): Promise<void> {
  const demoPassword = process.env.DEMO_PASSWORD
  if (!demoPassword || demoPassword.length < 8) {
    throw new Error('DEMO_PASSWORD requis (8 caractères minimum)')
  }
  const hashed = await bcrypt.hash(demoPassword, 10)

  // Entreprises
  const companyIds: string[] = []
  for (const c of COMPANIES) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        password: hashed,
        role: 'COMPANY',
        company: {
          create: {
            name: c.name,
            secteur: c.secteur,
            ville: c.ville,
            description: c.description,
            ...(c.website && { website: c.website }),
          },
        },
      },
      include: { company: true },
    })
    companyIds.push(user.company!.id)
  }
  console.log(`· ${COMPANIES.length} entreprises prêtes`)

  // Étudiants
  const studentIds: string[] = []
  const studentUserIds: string[] = []
  for (const s of STUDENTS) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        password: hashed,
        role: 'STUDENT',
        student: {
          create: {
            firstName: s.firstName,
            lastName: s.lastName,
            ville: s.ville,
            bio: s.bio,
            skills: s.skills,
          },
        },
      },
      include: { student: true },
    })
    studentIds.push(user.student!.id)
    studentUserIds.push(user.id)
  }
  console.log(`· ${STUDENTS.length} étudiants prêts`)

  // Offres (skip si déjà présentes — idempotence grossière par titre+entreprise)
  const jobIds: string[] = []
  for (const [ci, title, type, ville, secteur, duration, salary] of JOBS) {
    const existing = await prisma.job.findFirst({
      where: { title, companyId: companyIds[ci] },
    })
    if (existing) {
      jobIds.push(existing.id)
      continue
    }
    const job = await prisma.job.create({
      data: {
        companyId: companyIds[ci],
        title,
        description: jobDescription(title, COMPANIES[ci].name),
        type,
        ville,
        secteur,
        ...(duration && { duration }),
        ...(salary && { salary }),
      },
    })
    jobIds.push(job.id)
  }
  console.log(`· ${JOBS.length} offres prêtes`)

  // Candidatures — l'étudiant démo voit les 4 statuts, l'entreprise démo reçoit
  const applications: [number, number, 'PENDING' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED', string?][] = [
    [0, 0, 'PENDING', 'Madame, Monsieur,\n\nÉtudiante en L3 IDA à l\'UNCHK, votre offre correspond exactement à mon projet professionnel. Mon portfolio de projets React/Node est disponible sur demande.\n\nCordialement,\nAïssatou Fall'],
    [0, 4, 'INTERVIEW', 'Bonjour,\n\nPassionnée par la data, je serais ravie de rejoindre votre programme d\'alternance.'],
    [0, 7, 'REJECTED'],
    [0, 8, 'ACCEPTED', 'Bonjour,\n\nMon mémoire porte sur une plateforme web — la data science appliquée m\'attire pour la suite.'],
    [1, 8, 'PENDING', 'Bonjour, mon profil Python/SQL correspond bien à ce stage.'],
    [1, 1, 'PENDING'],
    [2, 2, 'INTERVIEW', 'Bonjour, deux applications Flutter publiées, je serais ravie d\'échanger.'],
    [3, 3, 'PENDING'],
  ]
  let createdApps = 0
  for (const [si, ji, status, coverLetter] of applications) {
    const exists = await prisma.application.findUnique({
      where: { studentId_jobId: { studentId: studentIds[si], jobId: jobIds[ji] } },
    })
    if (exists) continue
    await prisma.application.create({
      data: {
        studentId: studentIds[si],
        jobId: jobIds[ji],
        status,
        ...(coverLetter && { coverLetter }),
      },
    })
    createdApps++
  }
  console.log(`· ${createdApps} candidatures créées`)

  // Conversation démo : InnovTech (entreprise démo) ↔ Aïssatou (étudiante démo)
  const companyDemoUser = await prisma.user.findUnique({ where: { email: COMPANIES[0].email } })
  const conversationId = [studentUserIds[0], companyDemoUser!.id].sort().join('_')
  const existingConv = await prisma.message.findFirst({ where: { conversationId } })
  if (!existingConv) {
    const thread: [('student' | 'company'), string][] = [
      ['student', 'Bonjour, je viens de postuler à votre offre de stage Développeur Fullstack Junior. Je reste disponible pour tout complément.'],
      ['company', 'Bonjour Aïssatou, merci pour votre candidature ! Votre profil a retenu notre attention. Seriez-vous disponible mardi à 14h pour un entretien en visio ?'],
      ['student', 'Bonjour, oui mardi 14h me convient parfaitement. Merci beaucoup !'],
      ['company', 'Parfait, je vous envoie l\'invitation. À mardi !'],
    ]
    let ts = Date.now() - 3 * 24 * 60 * 60 * 1000
    for (const [from, content] of thread) {
      const senderId = from === 'student' ? studentUserIds[0] : companyDemoUser!.id
      const receiverId = from === 'student' ? companyDemoUser!.id : studentUserIds[0]
      await prisma.message.create({
        data: {
          senderId,
          receiverId,
          conversationId,
          content,
          isRead: true,
          createdAt: new Date(ts),
        },
      })
      ts += 45 * 60 * 1000
    }
    console.log('· conversation de démo créée (4 messages)')
  } else {
    console.log('· conversation de démo déjà présente')
  }

  console.log('\n✅ Base prête pour le jury.')
  console.log(`   Étudiant démo  : ${STUDENTS[0].email}`)
  console.log(`   Entreprise démo : ${COMPANIES[0].email}`)
}

cleanup()
  .then(seed)
  .catch((err) => {
    console.error('❌', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

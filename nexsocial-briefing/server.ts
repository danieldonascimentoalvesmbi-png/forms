import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  getDatabase,
  saveDatabase,
  verifyPassword,
  signToken,
  verifyToken,
  hashPassword,
  initDatabase,
  Settings,
  FormField,
  FormResponse,
  ResponseAnswer
} from './server/db.js';

// Setup environment and server
const app = express();
const PORT = 3000;

// Enable JSON parse with payload size controls
app.use(express.json({ limit: '10mb' }));

// Simple Input Sanitizer
function sanitizeInput(val: any): any {
  if (typeof val === 'string') {
    return val.replace(/<[^>]*>/g, '').trim();
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeInput);
  }
  if (typeof val === 'object' && val !== null) {
    const res: any = {};
    for (const key of Object.keys(val)) {
      res[key] = sanitizeInput(val[key]);
    }
    return res;
  }
  return val;
}

// In-memory simple rate limiting for form submissions to secure endpoint
const submissionRates = new Map<string, { count: number; resetAt: number }>();
function formRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowTime = 15 * 60 * 1000; // 15 mins
  const limit = 20; // max submissions per 15min window
  
  let entry = submissionRates.get(ip);
  if (!entry || now > entry.resetAt) {
    submissionRates.set(ip, { count: 1, resetAt: now + windowTime });
    return next();
  }
  
  if (entry.count >= limit) {
    return res.status(429).json({ error: 'Muitos envios de formulário de forma consecutiva. Por favor, aguarde 15 minutos.' });
  }
  
  entry.count++;
  next();
}

// Authentication Middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso negado. Token de segurança não incluído.' });
  }
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || decoded.username !== 'admin') {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
  (req as any).user = decoded;
  next();
}

// ==========================================
// PUBLIC API: GLOBAL SETTINGS
// ==========================================
app.get('/api/public-settings', (req, res) => {
  try {
    const db = getDatabase();
    res.json(db.settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PUBLIC API: FORM FIELDS
// ==========================================
app.get('/api/form-fields', (req, res) => {
  try {
    const db = getDatabase();
    // Return sorted, non-hidden fields
    const visibleFields = db.form_fields
      .filter(f => !f.hidden)
      .sort((a, b) => {
        if (a.step !== b.step) return a.step - b.step;
        return a.order - b.order;
      });
    res.json(visibleFields);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PUBLIC API: SUBMIT BRIEFING RESPONSE
// ==========================================
app.post('/api/form-responses', formRateLimit, (req, res) => {
  try {
    const db = getDatabase();
    const payload = sanitizeInput(req.body);
    const answersMap = payload.answers || {}; // Key is fieldId, Value is user answer

    const visibleFields = db.form_fields.filter(f => !f.hidden);
    
    // Server-side validation
    const missing: string[] = [];
    for (const field of visibleFields) {
      if (field.required) {
        const val = answersMap[field.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          missing.push(field.label);
        }
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({ 
        error: `Os seguintes campos obrigatórios estão ausentes ou em branco: ${missing.join(', ')}` 
      });
    }

    // Capture main quick lookups
    const companyName = String(answersMap['companyName'] || answersMap['Nome da Empresa'] || 'Não especificado');
    const mainCity = String(answersMap['mainCity'] || answersMap['Cidade principal de atendimento'] || 'Não informado');
    const email = String(answersMap['email'] || answersMap['E-mail'] || '');
    const whatsapp = String(answersMap['whatsapp'] || answersMap['WhatsApp Principal'] || '');

    const responseId = 'resp_' + Math.random().toString(36).substr(2, 9);
    
    // Create Response Record
    const newResponse: FormResponse = {
      id: responseId,
      formId: 'briefing-form',
      companyName,
      city: mainCity,
      email,
      whatsapp,
      createdAt: new Date().toISOString(),
      status: 'unread',
      internalNotes: ''
    };

    // Save corresponding answers
    const responseAnswers: ResponseAnswer[] = [];
    for (const field of db.form_fields) {
      const val = answersMap[field.id];
      if (val !== undefined && val !== null) {
        responseAnswers.push({
          id: 'ans_' + Math.random().toString(36).substr(2, 9),
          responseId,
          fieldId: field.id,
          value: val
        });
      }
    }

    db.form_responses.push(newResponse);
    db.response_answers.push(...responseAnswers);
    saveDatabase(db);

    res.status(201).json({ success: true, message: 'Formulário e briefing enviados com sucesso!', responseId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SESSION & AUTHENTICATION
// ==========================================
app.post('/api/auth/login', (req, res) => {
  try {
    const db = getDatabase();
    const { username, password } = sanitizeInput(req.body);

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }

    const user = db.users.find(u => u.username === username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    const token = signToken({ id: user.id, username: user.username });
    res.json({ token, username: user.username });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN DASHBOARD STATISTICS
// ==========================================
app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const responses = db.form_responses;
    
    const now = new Date();
    
    // 1. Total
    const total = responses.length;

    // 2. Today
    const todayStr = now.toISOString().split('T')[0];
    const totalToday = responses.filter(r => r.createdAt.startsWith(todayStr)).length;

    // 3. This week (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const totalThisWeek = responses.filter(r => new Date(r.createdAt) >= sevenDaysAgo).length;

    // 4. This month (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const totalThisMonth = responses.filter(r => new Date(r.createdAt) >= thirtyDaysAgo).length;

    // Sort responses to show recent ones
    const mostRecent = [...responses]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    res.json({
      total,
      totalToday,
      totalThisWeek,
      totalThisMonth,
      recent: mostRecent
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN GET FORM RESPONSES (WITH FILTER)
// ==========================================
app.get('/api/admin/responses', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    let responses = [...db.form_responses];
    const { query } = req.query;

    if (query) {
      const q = String(query).toLowerCase();
      responses = responses.filter(r => 
        r.companyName.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.whatsapp.includes(q)
      );
    }

    // Sort descended by date
    responses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(responses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN GET SPECIFIC RESPONSE WITH ALL ANSWERS
// ==========================================
app.get('/api/admin/responses/:id', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const response = db.form_responses.find(r => r.id === id);
    if (!response) {
      return res.status(404).json({ error: 'Resposta de briefing não encontrada.' });
    }

    const answers = db.response_answers.filter(a => a.responseId === id);

    // Map answers containing their field definitions and steps
    const detailedAnswers = answers.map(ans => {
      const fieldDef = db.form_fields.find(f => f.id === ans.fieldId);
      return {
        fieldId: ans.fieldId,
        label: fieldDef ? fieldDef.label : ans.fieldId,
        step: fieldDef ? fieldDef.step : 99,
        type: fieldDef ? fieldDef.type : 'text',
        value: ans.value
      };
    }).sort((a, b) => a.step - b.step);

    res.json({
      response,
      answers: detailedAnswers
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN UPDATE STATUS
// ==========================================
app.put('/api/admin/responses/:id/status', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { status } = req.body; // 'read' | 'unread' | 'replied'

    if (!['read', 'unread', 'replied'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Escolha "unread", "read" ou "replied".' });
    }

    const idx = db.form_responses.findIndex(r => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Resposta não encontrada.' });
    }

    db.form_responses[idx].status = status;
    saveDatabase(db);

    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN UPDATE INTERNAL NOTES
// ==========================================
app.put('/api/admin/responses/:id/notes', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { notes } = req.body;

    const idx = db.form_responses.findIndex(r => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Resposta não encontrada.' });
    }

    db.form_responses[idx].internalNotes = sanitizeInput(notes);
    saveDatabase(db);

    res.json({ success: true, notes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN EDIT RESPONSE ANSWERS DIRECTLY
// ==========================================
app.put('/api/admin/responses/:id', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { companyName, city, email, whatsapp, answers } = sanitizeInput(req.body);

    const respIndex = db.form_responses.findIndex(r => r.id === id);
    if (respIndex === -1) {
      return res.status(404).json({ error: 'Registro não encontrado.' });
    }

    // Update main fields
    if (companyName) db.form_responses[respIndex].companyName = companyName;
    if (city) db.form_responses[respIndex].city = city;
    if (email) db.form_responses[respIndex].email = email;
    if (whatsapp) db.form_responses[respIndex].whatsapp = whatsapp;

    // Update answer array items
    if (answers && typeof answers === 'object') {
      for (const fieldId of Object.keys(answers)) {
        const val = answers[fieldId];
        const ansIndex = db.response_answers.findIndex(a => a.responseId === id && a.fieldId === fieldId);
        if (ansIndex !== -1) {
          db.response_answers[ansIndex].value = val;
        } else {
          // If answer doesn't exist, insert new
          db.response_answers.push({
            id: 'ans_' + Math.random().toString(36).substr(2, 9),
            responseId: id,
            fieldId,
            value: val
          });
        }
      }
    }

    saveDatabase(db);
    res.json({ success: true, message: 'Dados do briefing editados com sucesso!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN DELETE RESPONSE
// ==========================================
app.delete('/api/admin/responses/:id', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const respIndex = db.form_responses.findIndex(r => r.id === id);
    if (respIndex === -1) {
      return res.status(404).json({ error: 'Registro não encontrado.' });
    }

    // Remove response record
    db.form_responses.splice(respIndex, 1);
    // Remove all associated answer values
    db.response_answers = db.response_answers.filter(a => a.responseId !== id);

    saveDatabase(db);
    res.json({ success: true, message: 'Resposta excluída com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN FORM FIELD BUILDER & MANAGEMENT
// ==========================================
app.get('/api/admin/form-fields', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    res.json(db.form_fields.sort((a, b) => {
      if (a.step !== b.step) return a.step - b.step;
      return a.order - b.order;
    }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/form-fields', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const { id, type, label, placeholder, required, options, step, order, hidden } = sanitizeInput(req.body);

    if (!id || !type || !label || !step) {
      return res.status(400).json({ error: 'Campos "id", "tipo", "rótulo" e "etapa" são obrigatórios.' });
    }

    // Check duplicate ID
    if (db.form_fields.some(f => f.id === id)) {
      return res.status(400).json({ error: 'Já existe uma pergunta cadastrada com este Identificador (ID).' });
    }

    const newField: FormField = {
      id,
      formId: 'briefing-form',
      type,
      label,
      placeholder: placeholder || '',
      required: Boolean(required),
      options: Array.isArray(options) ? options : undefined,
      step: Number(step),
      order: isNaN(Number(order)) ? 10 : Number(order),
      hidden: Boolean(hidden)
    };

    db.form_fields.push(newField);
    saveDatabase(db);

    res.status(201).json({ success: true, field: newField });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/form-fields/:id', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const body = sanitizeInput(req.body);

    const idx = db.form_fields.findIndex(f => f.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Pergunta não encontrada.' });
    }

    // Update field values
    const f = db.form_fields[idx];
    if (body.type !== undefined) f.type = body.type;
    if (body.label !== undefined) f.label = body.label;
    if (body.placeholder !== undefined) f.placeholder = body.placeholder;
    if (body.required !== undefined) f.required = Boolean(body.required);
    if (body.options !== undefined) f.options = Array.isArray(body.options) ? body.options : undefined;
    if (body.step !== undefined) f.step = Number(body.step);
    if (body.order !== undefined) f.order = Number(body.order);
    if (body.hidden !== undefined) f.hidden = Boolean(body.hidden);

    db.form_fields[idx] = f;
    saveDatabase(db);

    res.json({ success: true, field: f });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/form-fields/:id', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const idx = db.form_fields.findIndex(f => f.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Pergunta não encontrada.' });
    }

    db.form_fields.splice(idx, 1);
    saveDatabase(db);

    res.json({ success: true, message: 'Pergunta excluída com sucesso do editor do formulário.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN EDIT GLOBAL SYSTEM SETTINGS
// ==========================================
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  try {
    const db = getDatabase();
    const updatedSettings = sanitizeInput(req.body);

    if (updatedSettings.siteName) db.settings.siteName = updatedSettings.siteName;
    if (updatedSettings.logo) db.settings.logo = updatedSettings.logo;
    if (updatedSettings.slogan) db.settings.slogan = updatedSettings.slogan;
    if (updatedSettings.email) db.settings.email = updatedSettings.email;
    if (updatedSettings.whatsapp) db.settings.whatsapp = updatedSettings.whatsapp;
    if (updatedSettings.phone) db.settings.phone = updatedSettings.phone;
    if (updatedSettings.facebook) db.settings.facebook = updatedSettings.facebook;
    if (updatedSettings.instagram) db.settings.instagram = updatedSettings.instagram;
    
    if (updatedSettings.colors && typeof updatedSettings.colors === 'object') {
      const c = updatedSettings.colors;
      if (c.primary) db.settings.colors.primary = c.primary;
      if (c.bg) db.settings.colors.bg = c.bg;
      if (c.text) db.settings.colors.text = c.text;
      if (c.card) db.settings.colors.card = c.card;
    }

    saveDatabase(db);
    res.json({ success: true, settings: db.settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SEO ENDPOINTS (Sitemap, Robots, Meta tags)
// ==========================================
app.get('/robots.txt', (req, res) => {
  const hostUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    `Sitemap: ${hostUrl}/sitemap.xml`
  ].join('\n');
  
  res.header('Content-Type', 'text/plain');
  res.send(robots);
});

app.get('/sitemap.xml', (req, res) => {
  const hostUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const today = new Date().toISOString().split('T')[0];
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${hostUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${hostUrl}/formulario</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${hostUrl}/sobre</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// Dynamic SEO recommendations
app.get('/api/seo-meta', (req, res) => {
  try {
    const db = getDatabase();
    
    // Aggregate SEO tags from responses
    const targetCities = new Set<string>();
    const focusKeywords = new Set<string>();

    db.response_answers.forEach(ans => {
      if (ans.fieldId === 'seoCities' && ans.value) {
        String(ans.value).split(',').map(s => s.trim()).forEach(c => c && targetCities.add(c));
      }
      if (ans.fieldId === 'seoKeywords' && ans.value) {
        String(ans.value).split(',').map(s => s.trim()).forEach(k => k && focusKeywords.add(k));
      }
    });

    const defaultCities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Porto Alegre', 'Curitiba', 'Campinas', 'Salvador'];
    const defaultKeywords = ['tratamento dependência química', 'clinica de recuperação', 'reabilitação de alcoolistas', 'internação involuntária'];

    res.json({
      title: `${db.settings.siteName} | ${db.settings.slogan}`,
      description: 'Grupo especializado em triagem, encaminhamento e acompanhamento profissional para clínicas de reabilitação, dependência química e saúde mental.',
      openGraph: {
        type: 'website',
        locale: 'pt_BR',
        url: process.env.APP_URL || 'https://dependenciasquimicasbrasil.com.br',
        siteName: db.settings.siteName,
        title: `${db.settings.siteName} - Triagem e Acompanhamento`,
        description: 'Seu briefing personalizado: formulário estruturado para desenvolvimento e apoio para clínicas de recuperação do país.'
      },
      schema: {
        '@context': 'https://schema.org',
        '@type': 'MedicalBusiness',
        'name': db.settings.siteName,
        'description': db.settings.slogan,
        'url': 'https://dependenciasquimicasbrasil.com.br',
        'telephone': db.settings.phone || db.settings.whatsapp,
        'email': db.settings.email,
        'address': {
          '@type': 'PostalAddress',
          'addressLocality': 'São Paulo',
          'addressCountry': 'BR'
        }
      },
      aggregateSeoTargets: {
        cities: targetCities.size > 0 ? Array.from(targetCities) : defaultCities,
        keywords: focusKeywords.size > 0 ? Array.from(focusKeywords) : defaultKeywords
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// VITE DEV SERVER & PROD STATIC SERVING
// ==========================================
async function startServer() {
  // Sync latest state from cloud Supabase before starting listener
  await initDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();

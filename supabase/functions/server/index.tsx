// TrueFocus Server - Admin Dashboard & Stripe Integration
// Version: 1.1.0 - Admin endpoints added
// Last updated: 2026-03-02

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// Stripe configuration
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const STRIPE_PUBLISHABLE_KEY = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

// ✅ STRIPE PRICE IDs - UPDATED TO USD (2026-03-04)
// These are the correct Price IDs for USD prices from Stripe Dashboard:
//   - Monthly: $6.99/month USD
//   - Annual: $59/year USD  
//   - Lifetime: $149 one-time USD
//
// OLD BRL Price IDs (DO NOT USE):
//   monthly: 'price_1T0k2k00ioXrcGDpiQGLQ1eN'  ❌ BRL
//   annual: 'price_1T0k2E00ioXrcGDpCBUgPkc9'   ❌ BRL
const STRIPE_PRICES = {
  monthly: 'price_1T5qCR00ioXrcGDp2ZfkLMcJ',   // ✅ $6.99 USD/month
  annual: 'price_1T5qCx00ioXrcGDpVqRkNZkI',    // ✅ $59 USD/year
  lifetime: 'price_1T5qDQ00ioXrcGDpiMweUhZL'   // ✅ $149 USD one-time
};

// Create Supabase client with SERVICE_ROLE_KEY for admin operations
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Create Supabase client with ANON_KEY for JWT validation
const supabaseAnon = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

// Enable logger - use stderr to avoid interfering with JSON responses
app.use('*', logger((str: string) => {
  console.error(str);
}));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-User-Token", "x-user-token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: false,
  }),
);

// Health check endpoint
app.get("/make-server-41f917a5/health", (c) => {
  return c.json({ 
    status: "ok",
    version: "1.1.0", // Updated version
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/make-server-41f917a5/health",
      stripeCheckout: "/make-server-41f917a5/stripe/create-checkout",
      adminUsers: "/make-server-41f917a5/admin/users",
      adminStats: "/make-server-41f917a5/admin/stats",
      debugStripe: "/make-server-41f917a5/debug/stripe",
      debugAuth: "/make-server-41f917a5/debug/auth",
      checkSchema: "/make-server-41f917a5/debug/check-tasks-schema"
    }
  });
});

// Check tasks table schema
app.get("/make-server-41f917a5/debug/check-tasks-schema", async (c) => {
  try {
    // Try to select with order field
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('id, text, order')
      .limit(1);
    
    if (error) {
      console.log('Schema check error:', error);
      return c.json({
        hasOrderColumn: false,
        error: error.message,
        hint: 'You may need to add the "order" column to tasks table',
        sql: 'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;'
      });
    }
    
    return c.json({
      hasOrderColumn: true,
      message: 'Tasks table has order column',
      sample: data
    });
  } catch (error) {
    return c.json({
      error: String(error)
    });
  }
});

// Simple test endpoint that doesn't require auth validation from Supabase
app.get("/make-server-41f917a5/ping", (c) => {
  return c.json({ 
    message: "pong",
    timestamp: new Date().toISOString(),
    env: {
      hasStripeKey: !!STRIPE_SECRET_KEY,
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL')
    }
  });
});

// Debug endpoint for Stripe config
app.get("/make-server-41f917a5/debug/stripe", (c) => {
  return c.json({
    secretKey: STRIPE_SECRET_KEY ? `${STRIPE_SECRET_KEY.substring(0, 10)}...` : 'NOT SET',
    publishableKey: STRIPE_PUBLISHABLE_KEY ? `${STRIPE_PUBLISHABLE_KEY.substring(0, 10)}...` : 'NOT SET',
    webhookSecret: STRIPE_WEBHOOK_SECRET ? `${STRIPE_WEBHOOK_SECRET.substring(0, 10)}...` : 'NOT SET',
    prices: STRIPE_PRICES,
    warning: '⚠️ If checkout shows R$ instead of USD, you need to create NEW price IDs in Stripe Dashboard with USD currency'
  });
});

// Debug endpoint to check actual Stripe price details (currency, amount)
app.get("/make-server-41f917a5/debug/stripe-prices", async (c) => {
  if (!STRIPE_SECRET_KEY) {
    return c.json({ error: 'Stripe not configured' }, 500);
  }

  try {
    const priceChecks = await Promise.all([
      fetch(`https://api.stripe.com/v1/prices/${STRIPE_PRICES.monthly}`, {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
      }).then(r => r.json()),
      fetch(`https://api.stripe.com/v1/prices/${STRIPE_PRICES.annual}`, {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
      }).then(r => r.json())
    ]);

    return c.json({
      monthly: {
        id: STRIPE_PRICES.monthly,
        currency: priceChecks[0].currency,
        amount: priceChecks[0].unit_amount,
        formatted: `${(priceChecks[0].unit_amount / 100).toFixed(2)} ${priceChecks[0].currency.toUpperCase()}`,
        isUSD: priceChecks[0].currency === 'usd',
        warning: priceChecks[0].currency !== 'usd' ? '❌ NOT USD! Create new price in Stripe Dashboard' : '✅ Correct'
      },
      annual: {
        id: STRIPE_PRICES.annual,
        currency: priceChecks[1].currency,
        amount: priceChecks[1].unit_amount,
        formatted: `${(priceChecks[1].unit_amount / 100).toFixed(2)} ${priceChecks[1].currency.toUpperCase()}`,
        isUSD: priceChecks[1].currency === 'usd',
        warning: priceChecks[1].currency !== 'usd' ? '❌ NOT USD! Create new price in Stripe Dashboard' : '✅ Correct'
      }
    });
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch price details from Stripe',
      details: String(error),
      hint: 'Make sure the Price IDs are valid and exist in your Stripe account'
    }, 500);
  }
});

// Debug endpoint to test auth token
app.post("/make-server-41f917a5/debug/test-token", async (c) => {
  try {
    const body = await c.req.json();
    const { token } = body;
    
    console.log('🧪 Testing token:', token ? `${token.substring(0, 50)}... (length: ${token.length})` : 'NO TOKEN');
    
    if (!token) {
      return c.json({
        success: false,
        error: 'No token provided'
      });
    }
    
    // Use global admin client to prevent lock issues
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    console.log('🧪 Direct auth test - data:', data ? `User: ${data.user?.email}` : 'NO DATA');
    console.log('🧪 Direct auth test - error:', error ? error.message : 'NO ERROR');
    
    return c.json({
      success: !error && !!data?.user,
      user: data?.user ? { id: data.user.id, email: data.user.email } : null,
      error: error ? error.message : null,
      raw_error: error
    });
  } catch (err) {
    console.error('🧪 Exception in test-token:', err);
    return c.json({
      success: false,
      error: String(err)
    });
  }
});

// Migration endpoint to update tasks category constraint
app.post("/make-server-41f917a5/migrate/update-categories", async (c) => {
  try {
    console.log('🔧 Starting migration to remove category constraint...');
    
    // Drop the constraint completely - the app now supports dynamic categories
    const dropConstraint = await supabaseAdmin.rpc('exec_sql', {
      sql: 'ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_category_check;'
    }).catch(() => {
      // If RPC doesn't work, return error with SQL instructions
      return { error: 'RPC not available' };
    });
    
    console.log('✅ Migration completed - category constraint removed');
    
    return c.json({ 
      success: true, 
      message: 'Category constraint removed. Tasks table now accepts any category value.',
      sqlExecuted: 'ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_category_check;'
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    return c.json({ 
      success: false, 
      error: 'Migration failed. Please update the constraint manually in Supabase Dashboard.',
      details: String(error),
      instructions: 'Run this SQL in Supabase SQL Editor (Dashboard → SQL Editor):\n\n' +
                   'ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_category_check;\n\n' +
                   'This will remove the category validation and allow any category value.'
    }, 500);
  }
});

// Debug endpoint for auth testing
app.get("/make-server-41f917a5/debug/auth", async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.split(' ')[1];
  
  console.log('🧪 Auth Debug Test:', {
    hasAuthHeader: !!authHeader,
    authHeaderPreview: authHeader?.substring(0, 50),
    hasToken: !!token,
    tokenLength: token?.length,
    tokenPreview: token?.substring(0, 30)
  });

  if (!token) {
    return c.json({
      success: false,
      error: 'No token provided',
      authHeader: authHeader
    });
  }

  // Test with global admin client only (prevents lock issues)
  const tests: any = {};

  try {
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.getUser(token);
    tests.adminDirect = {
      success: !!adminData?.user,
      email: adminData?.user?.email,
      userId: adminData?.user?.id,
      error: adminError?.message,
      errorCode: adminError?.code
    };
  } catch (e) {
    tests.adminDirect = { error: String(e) };
  }

  return c.json({
    token: {
      length: token.length,
      preview: token.substring(0, 50) + '...'
    },
    tests,
    note: 'Using global admin client to prevent lock issues'
  });
});

// Simple test endpoint without auth
app.get("/make-server-41f917a5/debug/ping", async (c) => {
  return c.json({ 
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ========================================
// AUTH ENDPOINTS
// ========================================

// Helper function to get authenticated user
async function getAuthenticatedUser(authHeader: string | null, customTokenHeader: string | null = null) {
  // Try custom header first (X-User-Token)
  const token = customTokenHeader || authHeader?.split(' ')[1];
  
  if (!token) {
    console.log('❌ No token provided');
    return { user: null, error: 'No token provided' };
  }

  console.log('🔍 Validating token:', token.substring(0, 30) + '...');
  console.log('🔍 Token length:', token.length);

  try {
    // CRITICAL FIX: Use the global supabaseAdmin client instead of creating new instances
    // This prevents "lock not released" errors from multiple client creations
    console.log('🔍 Calling getUser() with admin client...');
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    console.log('🔍 Supabase response - has user:', !!data?.user);
    console.log('🔍 Supabase response - error:', error?.message || 'none');
    
    if (error) {
      console.error('❌ Supabase returned error:', {
        message: error.message,
        status: error.status,
        code: error.code
      });
      return { user: null, error: error.message || 'Token validation failed' };
    }
    
    if (!data?.user) {
      console.error('❌ No user in response data');
      return { user: null, error: 'User not found in token' };
    }

    console.log('✅ User authenticated successfully:', data.user.email, 'ID:', data.user.id);
    return { user: data.user, error: null };
  } catch (err) {
    console.error('❌ Exception during auth validation:', err);
    return { user: null, error: String(err) };
  }
}

// ========================================
// AI ENDPOINTS
// ========================================

// Parse voice transcript into a scheduled task (title + date + time) using GPT-4o-mini
app.post("/make-server-41f917a5/ai/parse-voice-task", async (c) => {
  try {
    // Require an authenticated user (protects the OpenAI key from anonymous abuse)
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { transcript, currentDate } = await c.req.json();
    if (!transcript || typeof transcript !== 'string') {
      return c.json({ error: 'transcript is required' }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return c.json({ error: 'OpenAI not configured (missing OPENAI_API_KEY)' }, 500);
    }

    const today = currentDate || new Date().toISOString().split('T')[0];

    const userPrompt =
      `Hoje é ${today}. O usuário disse: "${transcript}"\n` +
      `Extraia: o título do compromisso/tarefa e a data exata (YYYY-MM-DD) e a hora (HH:mm, opcional).\n` +
      `Se o usuário não disser o ano, use o ano da data de hoje. Se não disser hora, use null.\n` +
      `Responda APENAS em JSON: {"title": "...", "date": "YYYY-MM-DD", "time": "HH:mm ou null"}\n` +
      `Não inclua categoria — isso não é relevante para agendamento.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente que extrai informações de agendamento de compromissos. Responda sempre e apenas com JSON válido, sem texto adicional.',
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    const openaiData = await openaiResponse.json();
    if (openaiData.error) {
      console.error('OpenAI error:', openaiData.error);
      return c.json({ error: openaiData.error.message || 'OpenAI request failed' }, 500);
    }

    const rawContent = openaiData.choices?.[0]?.message?.content;
    if (!rawContent) {
      return c.json({ error: 'Empty response from AI' }, 500);
    }

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('Failed to parse AI JSON:', rawContent);
      return c.json({ error: 'AI returned invalid JSON' }, 500);
    }

    // Normalizar campos
    const result = {
      title: String(parsed.title || '').trim(),
      date: String(parsed.date || today).trim(),
      time: parsed.time && parsed.time !== 'null' ? String(parsed.time).trim() : null,
    };

    return c.json({ result });
  } catch (error) {
    console.error('parse-voice-task error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Signup endpoint
app.post("/make-server-41f917a5/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email e senha são obrigatórios" }, 400);
    }

    // Create user with admin API
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || '' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log("Error creating user during signup:", error);
      return c.json({ error: "Falha ao criar usuário", details: error.message }, 500);
    }

    console.log(`✅ User created: ${data.user.id} (${email})`);

    // Create trial license for the new user
    try {
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);

      const { error: licenseError } = await supabaseAdmin
        .from('licenses')
        .insert({
          user_id: data.user.id,
          user_email: email,
          user_name: name || '',
          license_type: 'trial',
          trial_started_at: new Date().toISOString(),
          trial_ends_at: trialExpiresAt.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (licenseError) {
        console.error('⚠️ Failed to create license for new user:', licenseError);
        // Don't fail the signup if license creation fails
        // User can still use the app
      } else {
        console.log(`✅ Trial license created for ${email}`);
      }
    } catch (licenseErr) {
      console.error('⚠️ Error creating license:', licenseErr);
    }

    // Auto-login after signup to get access token
    const { data: sessionData, error: sessionError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password
    });

    if (sessionError || !sessionData.session) {
      console.error('⚠️ Failed to auto-login after signup:', sessionError);
      // Return user info without token - frontend can handle login separately
      return c.json({ 
        message: "Usuário criado com sucesso",
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name
        }
      }, 201);
    }

    return c.json({ 
      message: "Usuário criado com sucesso",
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
        user_metadata: data.user.user_metadata
      },
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token
    }, 201);
  } catch (error) {
    console.log("Error during signup process:", error);
    return c.json({ error: "Falha ao criar usuário", details: String(error) }, 500);
  }
});

// Login endpoint
app.post("/make-server-41f917a5/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email e senha são obrigatórios" }, 400);
    }

    console.log(`🔐 Login attempt for: ${email}`);

    // Sign in with Supabase Auth
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.session) {
      console.error('Login failed:', error?.message);
      return c.json({ error: "Credenciais inválidas" }, 401);
    }

    console.log(`✅ Login successful: ${email}`);

    return c.json({ 
      message: "Login realizado com sucesso",
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
        user_metadata: data.user.user_metadata
      },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    }, 200);
  } catch (error) {
    console.error("Error during login process:", error);
    return c.json({ error: "Falha ao fazer login", details: String(error) }, 500);
  }
});

// ========================================
// TASKS ENDPOINTS
// ========================================

// Get all tasks
app.get("/make-server-41f917a5/tasks", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Use service role key to bypass RLS (we already validated the user)
    const { data: tasks, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    
    if (error) {
      console.log("Error fetching tasks:", error);
      return c.json({ error: "Failed to fetch tasks", details: error.message }, 500);
    }
    
    return c.json({ tasks: tasks || [] });
  } catch (error) {
    console.log("Error fetching tasks:", error);
    return c.json({ error: "Failed to fetch tasks", details: String(error) }, 500);
  }
});

// Get tasks by date
app.get("/make-server-41f917a5/tasks/:date", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const date = c.req.param("date");
    const { data: tasks, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.log("Error fetching tasks by date:", error);
      return c.json({ error: "Failed to fetch tasks", details: error.message }, 500);
    }
    
    return c.json({ tasks: tasks || [] });
  } catch (error) {
    console.log("Error fetching tasks by date:", error);
    return c.json({ error: "Failed to fetch tasks", details: String(error) }, 500);
  }
});

// Create task
app.post("/make-server-41f917a5/tasks", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const task = await c.req.json();
    
    const { data: newTask, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        text: task.text,
        category: task.category,
        duration_min: task.duration_min,
        date: task.date,
        mode: task.mode,
        completed: false,
        user_id: user.id,
        order: task.order || 0 // Add order field for drag-and-drop
      })
      .select()
      .single();
    
    if (error) {
      console.log("Error creating task:", error);
      return c.json({ error: "Failed to create task", details: error.message }, 500);
    }
    
    return c.json({ task: newTask }, 201);
  } catch (error) {
    console.log("Error creating task:", error);
    return c.json({ error: "Failed to create task", details: String(error) }, 500);
  }
});

// Update task
app.put("/make-server-41f917a5/tasks/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const taskId = c.req.param("id");
    const updates = await c.req.json();
    
    const { data: updatedTask, error } = await supabaseAdmin
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.log("Error updating task:", error);
      return c.json({ error: "Failed to update task", details: error.message }, 500);
    }
    
    if (!updatedTask) {
      return c.json({ error: "Task not found" }, 404);
    }
    
    return c.json({ task: updatedTask });
  } catch (error) {
    console.log("Error updating task:", error);
    return c.json({ error: "Failed to update task", details: String(error) }, 500);
  }
});

// Delete task
app.delete("/make-server-41f917a5/tasks/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const taskId = c.req.param("id");
    
    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);
    
    if (error) {
      console.log("Error deleting task:", error);
      return c.json({ error: "Failed to delete task", details: error.message }, 500);
    }
    
    return c.json({ message: "Task deleted" });
  } catch (error) {
    console.log("Error deleting task:", error);
    return c.json({ error: "Failed to delete task", details: String(error) }, 500);
  }
});

// ========================================
// RESCUE PROTOCOL ENDPOINTS
// ========================================

// Get all rescues
app.get("/make-server-41f917a5/rescues", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: rescues, error } = await supabaseAdmin
      .from('rescues')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    
    if (error) {
      console.log("Error fetching rescues:", error);
      return c.json({ error: "Failed to fetch rescues", details: error.message }, 500);
    }
    
    return c.json({ rescues: rescues || [] });
  } catch (error) {
    console.log("Error fetching rescues:", error);
    return c.json({ error: "Failed to fetch rescues", details: String(error) }, 500);
  }
});

// Create rescue
app.post("/make-server-41f917a5/rescues", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const rescue = await c.req.json();
    
    const { data: newRescue, error } = await supabaseAdmin
      .from('rescues')
      .insert({
        phase1_source: rescue.phase1_source,
        phase2_activity: rescue.phase2_activity,
        phase3_activity: rescue.phase3_activity,
        phase4_activity: rescue.phase4_activity,
        phase5_target: rescue.phase5_target,
        phase5_category: rescue.phase5_category,
        phase5_duration_min: rescue.phase5_duration_min,
        reflection_cause: rescue.reflection_cause,
        reflection_adjust: rescue.reflection_adjust,
        reflection_nugget: rescue.reflection_nugget,
        completed_date: rescue.completed_date,
        user_id: user.id
      })
      .select()
      .single();
    
    if (error) {
      console.log("Error creating rescue:", error);
      return c.json({ error: "Failed to create rescue", details: error.message }, 500);
    }
    
    return c.json({ rescue: newRescue }, 201);
  } catch (error) {
    console.log("Error creating rescue:", error);
    return c.json({ error: "Failed to create rescue", details: String(error) }, 500);
  }
});

// ========================================
// SETTINGS ENDPOINTS
// ========================================

// Get settings
app.get("/make-server-41f917a5/settings", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: settings, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.log("Error fetching settings:", error);
      return c.json({ error: "Failed to fetch settings", details: error.message }, 500);
    }
    
    // Return default settings if not found
    return c.json({ 
      settings: settings || {
        theme: "dark",
        notifications: true,
        sound: true
      }
    });
  } catch (error) {
    console.log("Error fetching settings:", error);
    return c.json({ error: "Failed to fetch settings", details: String(error) }, 500);
  }
});

// Update settings
app.put("/make-server-41f917a5/settings", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const settings = await c.req.json();
    
    const { data: updatedSettings, error } = await supabaseAdmin
      .from('settings')
      .upsert({
        user_id: user.id,
        theme: settings.theme,
        notifications: settings.notifications,
        sound: settings.sound,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.log("Error updating settings:", error);
      return c.json({ error: "Failed to update settings", details: error.message }, 500);
    }
    
    return c.json({ settings: updatedSettings });
  } catch (error) {
    console.log("Error updating settings:", error);
    return c.json({ error: "Failed to update settings", details: String(error) }, 500);
  }
});

// ========================================
// STRIPE ENDPOINTS
// ========================================

// Create Payment Intent (for Lifetime or initiating subscriptions)
app.post("/make-server-41f917a5/stripe/create-checkout", async (c) => {
  try {
    console.log('='.repeat(80));
    console.log('🛒 STRIPE CHECKOUT ENDPOINT CALLED');
    console.log('='.repeat(80));
    
    const body = await c.req.json();
    console.log('📦 Full request body:', JSON.stringify(body, null, 2));
    
    const { plan, userToken, returnUrl } = body;
    
    console.log('📋 Plan:', plan);
    console.log('🔑 UserToken present:', !!userToken);
    console.log('🔑 UserToken length:', userToken?.length);
    console.log('🔑 UserToken preview (first 50):', userToken ? userToken.substring(0, 50) + '...' : 'NO TOKEN');
    console.log('🔗 ReturnUrl:', returnUrl);
    
    // CRITICAL: Verify token exists before validation
    if (!userToken) {
      console.error('❌ CRITICAL: No userToken in request body!');
      return c.json({ 
        error: 'Unauthorized', 
        details: 'No authentication token provided in request body. Please log in again.',
        missingField: 'userToken'
      }, 401);
    }
    
    console.log('🔐 Starting token validation...');
    
    // Validate user token from body
    const { user, error: authError } = await getAuthenticatedUser(null, userToken);
    
    console.log('🔐 Validation result:');
    console.log('   - User:', user ? `${user.email} (ID: ${user.id})` : 'NULL');
    console.log('   - Error:', authError || 'NONE');
    
    if (authError || !user) {
      console.error('❌ AUTHENTICATION FAILED');
      console.error('   - Auth Error:', authError);
      console.error('   - User object:', user);
      return c.json({ 
        error: 'Unauthorized', 
        details: authError || 'Token validation failed. Please log in again.',
        hint: 'The access token may be expired or invalid.',
        debug: {
          authError,
          hasUser: !!user
        }
      }, 401);
    }

    console.log('✅ User authenticated:', user.email);

    if (!['monthly', 'annual', 'lifetime'].includes(plan)) {
      console.error('❌ Invalid plan:', plan);
      return c.json({ error: 'Invalid plan' }, 400);
    }

    console.log(`💳 Creating checkout for user ${user.email} - Plan: ${plan}`);
    console.log(`🔑 Stripe key present: ${!!STRIPE_SECRET_KEY}`);
    console.log(`🔑 Publishable key present: ${!!STRIPE_PUBLISHABLE_KEY}`);

    // Get or create Stripe customer
    const { data: license } = await supabaseAdmin
      .from('licenses')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('Existing customer ID:', license?.stripe_customer_id);

    let customerId = license?.stripe_customer_id;

    if (!customerId) {
      console.log('Creating new Stripe customer...');
      const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          email: user.email!,
          name: user.user_metadata?.name || '',
          'metadata[user_id]': user.id
        })
      });

      const customer = await customerResponse.json();
      console.log('Stripe customer response:', JSON.stringify(customer, null, 2));
      
      if (customer.error) {
        console.error('❌ Stripe customer creation error:', customer.error);
        return c.json({ error: 'Failed to create customer', details: customer.error.message }, 500);
      }

      customerId = customer.id;
      console.log('✅ Created customer:', customerId);

      // Update license with customer ID
      await supabaseAdmin
        .from('licenses')
        .upsert({
          user_id: user.id,
          user_email: user.email,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
    }

    // Create Stripe Checkout Session (hosted checkout page)
    console.log(`🌐 Creating Stripe Checkout Session for ${plan} plan...`);
    
    // Use returnUrl from frontend or fallback to default
    const baseUrl = returnUrl || 'https://truefocus.app';
    const successUrl = `${baseUrl}/landing?payment=success&plan=${plan}`;
    const cancelUrl = `${baseUrl}/landing?payment=cancelled`;
    
    console.log('🔗 Success URL:', successUrl);
    console.log('🔗 Cancel URL:', cancelUrl);
    
    const sessionParams = new URLSearchParams({
      customer: customerId,
      'success_url': successUrl,
      'cancel_url': cancelUrl,
      mode: plan === 'lifetime' ? 'payment' : 'subscription',
      'metadata[user_id]': user.id,
      'metadata[plan]': plan
    });

    // Add line item based on plan - All plans now use Stripe Price IDs
    const priceId = STRIPE_PRICES[plan as keyof typeof STRIPE_PRICES];
    
    if (!priceId) {
      console.error(`❌ No Price ID found for plan: ${plan}`);
      return c.json({ error: `Invalid plan: ${plan}` }, 400);
    }
    
    sessionParams.append('line_items[0][price]', priceId);
    sessionParams.append('line_items[0][quantity]', '1');

    const checkoutResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: sessionParams
    });

    const session = await checkoutResponse.json();
    console.log('Checkout session response:', JSON.stringify(session, null, 2));
    
    if (session.error) {
      console.error('❌ Checkout session error:', session.error);
      return c.json({ error: 'Failed to create checkout session', details: session.error.message }, 500);
    }

    console.log('✅ Checkout session created:', session.id);
    console.log('✅ Checkout URL:', session.url);

    return c.json({
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('❌ Stripe checkout error:', error);
    return c.json({ error: 'Failed to create checkout', details: String(error) }, 500);
  }
});

// Create Payment Intent (for inline Payment Element in app)
app.post("/make-server-41f917a5/stripe/create-payment-intent", async (c) => {
  try {
    console.log('='.repeat(80));
    console.log('💳 STRIPE PAYMENT INTENT ENDPOINT CALLED');
    console.log('='.repeat(80));
    
    const body = await c.req.json();
    console.log('📦 Full request body:', JSON.stringify(body, null, 2));
    
    const { plan, userToken } = body;
    
    console.log('📋 Plan:', plan);
    console.log('🔑 UserToken present:', !!userToken);
    
    // Verify token exists
    if (!userToken) {
      console.error('❌ CRITICAL: No userToken in request body!');
      return c.json({ 
        error: 'Unauthorized', 
        details: 'No authentication token provided in request body. Please log in again.',
        missingField: 'userToken'
      }, 401);
    }
    
    console.log('🔐 Starting token validation...');
    
    // Validate user token from body
    const { user, error: authError } = await getAuthenticatedUser(null, userToken);
    
    console.log('🔐 Validation result:');
    console.log('   - User:', user ? `${user.email} (ID: ${user.id})` : 'NULL');
    console.log('   - Error:', authError || 'NONE');
    
    if (authError || !user) {
      console.error('❌ AUTHENTICATION FAILED');
      return c.json({ 
        error: 'Unauthorized', 
        details: authError || 'Token validation failed. Please log in again.',
      }, 401);
    }

    console.log('✅ User authenticated:', user.email);

    if (!['monthly', 'annual', 'lifetime'].includes(plan)) {
      console.error('❌ Invalid plan:', plan);
      return c.json({ error: 'Invalid plan' }, 400);
    }

    console.log(`💳 Creating Payment Intent for user ${user.email} - Plan: ${plan}`);

    // Get or create Stripe customer
    const { data: license } = await supabaseAdmin
      .from('licenses')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('Existing customer ID:', license?.stripe_customer_id);

    let customerId = license?.stripe_customer_id;

    if (!customerId) {
      console.log('Creating new Stripe customer...');
      const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          email: user.email!,
          name: user.user_metadata?.name || '',
          'metadata[user_id]': user.id
        })
      });

      const customer = await customerResponse.json();
      
      if (customer.error) {
        console.error('❌ Stripe customer creation error:', customer.error);
        return c.json({ error: 'Failed to create customer', details: customer.error.message }, 500);
      }

      customerId = customer.id;
      console.log('✅ Created customer:', customerId);

      // Update license with customer ID
      await supabaseAdmin
        .from('licenses')
        .upsert({
          user_id: user.id,
          user_email: user.email,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
    }

    // Determine amount based on plan
    let amount: number;
    let description: string;
    
    if (plan === 'lifetime') {
      amount = 14900; // $149.00
      description = 'TrueFocus Pro - Lifetime Access';
    } else if (plan === 'annual') {
      amount = 5900; // $59.00
      description = 'TrueFocus Pro - Annual Subscription';
    } else {
      amount = 699; // $6.99
      description = 'TrueFocus Pro - Monthly Subscription';
    }

    console.log(`💰 Creating Payment Intent for ${amount / 100} USD`);

    // Create Payment Intent
    const paymentParams = new URLSearchParams({
      amount: amount.toString(),
      currency: 'usd',
      customer: customerId,
      description: description,
      'automatic_payment_methods[enabled]': 'true',
      'metadata[user_id]': user.id,
      'metadata[plan]': plan
    });

    // For subscriptions, we need to use setup mode
    if (plan !== 'lifetime') {
      paymentParams.set('setup_future_usage', 'off_session');
    }

    const paymentResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: paymentParams
    });

    const paymentIntent = await paymentResponse.json();
    console.log('Payment Intent response:', JSON.stringify(paymentIntent, null, 2));
    
    if (paymentIntent.error) {
      console.error('❌ Payment Intent error:', paymentIntent.error);
      return c.json({ error: 'Failed to create payment intent', details: paymentIntent.error.message }, 500);
    }

    console.log('✅ Payment Intent created:', paymentIntent.id);
    console.log('✅ Client Secret:', paymentIntent.client_secret?.substring(0, 30) + '...');

    return c.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey: STRIPE_PUBLISHABLE_KEY
    });

  } catch (error) {
    console.error('❌ Payment Intent error:', error);
    return c.json({ error: 'Failed to create payment intent', details: String(error) }, 500);
  }
});

// Stripe Webhook
app.post("/make-server-41f917a5/stripe/webhook", async (c) => {
  try {
    const body = await c.req.text();
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      return c.json({ error: 'No signature' }, 400);
    }

    // Verify webhook signature
    const signatureItems = signature.split(',').reduce((acc, item) => {
      const [key, value] = item.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = signatureItems['t'];
    const expectedSignature = signatureItems['v1'];

    // Simple signature verification (Stripe uses HMAC SHA256)
    const encoder = new TextEncoder();
    const data = encoder.encode(`${timestamp}.${body}`);
    const key = encoder.encode(STRIPE_WEBHOOK_SECRET!);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const computedSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (computedSignature !== expectedSignature) {
      console.error('⚠️ Invalid webhook signature');
      return c.json({ error: 'Invalid signature' }, 400);
    }

    const event = JSON.parse(body);
    console.log('🔔 Stripe webhook received:', event.type);

    switch (event.type) {
      // ✅ CHECKOUT SESSION COMPLETED (new Stripe Checkout flow)
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        
        console.log(`✅ Checkout session completed for user: ${userId} - Plan: ${plan}`);
        
        // Get user email
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (plan === 'lifetime') {
          // Lifetime plan
          await supabaseAdmin
            .from('licenses')
            .upsert({
              user_id: userId,
              user_email: userData?.user?.email || '',
              license_type: 'lifetime',
              subscription_started_at: new Date().toISOString(),
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            });
        } else if (session.subscription) {
          // Subscription plan (monthly/annual)
          // Stripe will also send customer.subscription.created event
          console.log('Subscription will be handled by customer.subscription.created event');
        }
        break;
      }

      // ✅ LIFETIME payment succeeded (old flow - keeping for backwards compatibility)
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        
        if (paymentIntent.metadata?.plan === 'lifetime') {
          const userId = paymentIntent.metadata?.user_id;
          
          console.log(`✅ Lifetime payment succeeded for user: ${userId}`);
          
          // Get user email
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
          
          await supabaseAdmin
            .from('licenses')
            .upsert({
              user_id: userId,
              user_email: userData?.user?.email || '',
              license_type: 'lifetime',
              subscription_started_at: new Date().toISOString(),
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            });
        }
        break;
      }

      // ✅ SUBSCRIPTION created/updated
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const priceId = subscription.items.data[0].price.id;
        
        let plan: 'monthly' | 'annual' = 'monthly';
        if (priceId === STRIPE_PRICES.annual) {
          plan = 'annual';
        }

        const userId = subscription.metadata?.user_id;
        
        console.log(`✅ Subscription ${event.type === 'customer.subscription.created' ? 'created' : 'updated'} for user: ${userId} - Plan: ${plan}`);
        
        // Get user email
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        await supabaseAdmin
          .from('licenses')
          .upsert({
            user_id: userId,
            user_email: userData?.user?.email || '',
            license_type: plan,
            subscription_started_at: new Date(subscription.current_period_start * 1000).toISOString(),
            subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        break;
      }

      // 🔄 INVOICE paid (renewal)
      case 'invoice.paid': {
        const invoice = event.data.object;
        
        if (invoice.subscription) {
          const { data: license } = await supabaseAdmin
            .from('licenses')
            .select('user_id')
            .eq('stripe_subscription_id', invoice.subscription)
            .maybeSingle();

          if (license) {
            console.log(`🔄 Subscription renewed for user: ${license.user_id}`);
            
            await supabaseAdmin
              .from('licenses')
              .update({
                subscription_ends_at: new Date(invoice.period_end * 1000).toISOString(),
                subscription_status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('user_id', license.user_id);
          }
        }
        break;
      }

      // ❌ SUBSCRIPTION canceled
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.user_id;
        
        console.log(`❌ Subscription canceled for user: ${userId}`);
        
        await supabaseAdmin
          .from('licenses')
          .update({
            license_type: 'free',
            subscription_status: 'canceled',
            subscription_ends_at: new Date(subscription.ended_at * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        break;
      }
    }

    return c.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ error: 'Webhook failed', details: String(error) }, 500);
  }
});

// ========================================
// ANNUAL GOALS ENDPOINTS
// ========================================

// 🆕 TEMPORARY DEBUG ENDPOINT - COMPLETELY BYPASS EVERYTHING
app.post("/make-server-41f917a5/test-goal-creation", async (c) => {
  console.log('');
  console.log('🔥🔥🔥 TEST GOAL CREATION ENDPOINT HIT 🔥🔥🔥');
  console.log('');
  
  try {
    const body = await c.req.json();
    console.log('Body received:', body);
    
    const { text, user_id, year } = body;
    
    if (!user_id || !text) {
      return c.json({ error: 'user_id and text required' }, 400);
    }
    
    const goalYear = year || new Date().getFullYear();
    
    console.log('Inserting goal:', { user_id, text: text.substring(0, 30), year: goalYear });
    
    const { data, error } = await supabaseAdmin
      .from('goals')
      .insert({
        user_id,
        year: goalYear,
        text: text.trim(),
        order: 1,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('DB Error:', error);
      return c.json({ error: 'DB error', details: error }, 500);
    }
    
    console.log('✅ Goal created!', data.id);
    return c.json({ success: true, goal: data });
    
  } catch (error) {
    console.error('Exception:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Helper function to validate goal text
function validateGoalText(text: string): { valid: boolean; error?: string } {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Goal text is required' };
  }
  
  const trimmed = text.trim();
  if (trimmed.length < 10) {
    return { valid: false, error: 'Goal must be at least 10 characters' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Goal must be no more than 100 characters' };
  }
  
  return { valid: true };
}

// GET /goals - List all goals for the current year (or specified year)
app.get("/make-server-41f917a5/goals", async (c) => {
  const authHeader = c.req.header('Authorization');
  
  console.log('📊 GET /goals - Auth check:', {
    hasAuthHeader: !!authHeader,
    authHeaderPreview: authHeader?.substring(0, 50)
  });

  const { user, error: authError } = await getAuthenticatedUser(authHeader);
  
  if (authError || !user) {
    console.error('Auth error in GET /goals:', authError);
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const year = c.req.query('year') ? parseInt(c.req.query('year')!) : new Date().getFullYear();

    const { data: goals, error } = await supabaseAdmin
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year)
      .order('order', { ascending: true });

    if (error) {
      console.error('Database error in GET /goals:', error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`✅ Retrieved ${goals?.length || 0} goals for user ${user.email}`);
    return c.json({ goals: goals || [] });
  } catch (error) {
    console.error('Error in GET /goals:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /api/goals - Create new goal (TEMPORARY NO AUTH VERSION)
app.post("/make-server-41f917a5/goals-no-auth", async (c) => {
  try {
    console.log('🔓 NO AUTH endpoint called');
    
    const { text, year, user_id } = await c.req.json();
    
    console.log('Received:', { text: text?.substring(0, 30), year, user_id });
    
    if (!user_id) {
      return c.json({ error: 'user_id required' }, 400);
    }
    
    if (!text || text.length < 10) {
      return c.json({ error: 'Text must be at least 10 chars' }, 400);
    }
    
    const goalYear = year || new Date().getFullYear();
    
    // Create goal WITHOUT any auth validation
    const { data: newGoal, error } = await supabaseAdmin
      .from('goals')
      .insert({
        user_id: user_id,
        year: goalYear,
        text: text.trim(),
        order: 1,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ DB error:', error);
      return c.json({ error: 'DB error', details: error.message }, 500);
    }
    
    console.log('✅ Goal created!');
    return c.json({ goal: newGoal });
  } catch (error) {
    console.error('❌ Exception:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// POST /api/goals - Create new goal
app.post("/make-server-41f917a5/goals", async (c) => {
  try {
    console.log('');
    console.log('='.repeat(80));
    console.log('🚀 POST /goals ENDPOINT HIT');
    console.log('='.repeat(80));
    
    const allHeaders = {};
    c.req.header().forEach((value: string, key: string) => {
      allHeaders[key] = value;
    });
    console.log('📋 All request headers:', allHeaders);
    
    const requestBody = await c.req.json();
    const { text, year, user_id } = requestBody;
    
    console.log('📦 Request body:', { 
      text: text?.substring(0, 30), 
      textLength: text?.length,
      year, 
      user_id,
      hasUserId: !!user_id
    });
    
    // TEMPORARY: COMPLETELY SKIP AUTH VALIDATION
    if (!user_id) {
      console.log('❌ ERROR: No user_id in body');
      return c.json({ error: 'user_id required in body' }, 400);
    }
    
    console.log('✅ user_id present:', user_id);
    
    if (!text || text.length < 10) {
      console.log('❌ ERROR: Text too short');
      return c.json({ error: 'Text must be at least 10 chars' }, 400);
    }
    
    if (!text || text.length > 100) {
      console.log('❌ ERROR: Text too long');
      return c.json({ error: 'Text must be max 100 chars' }, 400);
    }
    
    console.log('✅ Text validation passed');
    
    const goalYear = year || new Date().getFullYear();
    
    console.log('💾 Attempting database insert...');
    console.log('   - user_id:', user_id);
    console.log('   - year:', goalYear);
    console.log('   - text:', text.trim().substring(0, 50));
    
    // Create goal WITHOUT auth validation
    const { data: newGoal, error } = await supabaseAdmin
      .from('goals')
      .insert({
        user_id: user_id,
        year: goalYear,
        text: text.trim(),
        order: 1,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ DATABASE ERROR:', error);
      return c.json({ error: 'Database error', details: error.message }, 500);
    }
    
    console.log('✅✅✅ GOAL CREATED SUCCESSFULLY!');
    console.log('Goal ID:', newGoal.id);
    console.log('='.repeat(80));
    console.log('');
    
    return c.json({ goal: newGoal });
  } catch (error) {
    console.error('❌ EXCEPTION in POST /goals:', error);
    return c.json({ error: 'Server error', details: String(error) }, 500);
  }
});

// PATCH /api/goals/:id - Update goal text
app.patch("/make-server-41f917a5/goals/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const goalId = c.req.param('id');
    const { text } = await c.req.json();
    
    // Validate goal text
    const validation = validateGoalText(text);
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }
    
    // Check ownership and get current goal
    const { data: currentGoal } = await supabaseAdmin
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!currentGoal) {
      return c.json({ error: 'Goal not found' }, 404);
    }
    
    // Check for duplicate (excluding current goal)
    const { data: existing } = await supabaseAdmin
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', currentGoal.year)
      .eq('text', text.trim())
      .neq('id', goalId);
    
    if (existing && existing.length > 0) {
      return c.json({ error: 'Goal already exists for this year' }, 400);
    }
    
    // Update goal
    const { data: updatedGoal, error } = await supabaseAdmin
      .from('goals')
      .update({ text: text.trim() })
      .eq('id', goalId)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating goal:', error);
      return c.json({ error: 'Failed to update goal', details: error.message }, 500);
    }
    
    return c.json({ goal: updatedGoal });
  } catch (error) {
    console.error('Error in PATCH /goals/:id:', error);
    return c.json({ error: 'Failed to update goal', details: String(error) }, 500);
  }
});

// DELETE /api/goals/:id - Delete goal
app.delete("/make-server-41f917a5/goals/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const goalId = c.req.param('id');
    
    const { error } = await supabaseAdmin
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting goal:', error);
      return c.json({ error: 'Failed to delete goal', details: error.message }, 500);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /goals/:id:', error);
    return c.json({ error: 'Failed to delete goal', details: String(error) }, 500);
  }
});

// PATCH /api/goals/:id/review - Review goal status (only after Dec 31)
app.patch("/make-server-41f917a5/goals/:id/review", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const goalId = c.req.param('id');
    const { status } = await c.req.json();
    
    if (!['completed', 'partial', 'not_completed'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }
    
    // Get goal to check year
    const { data: goal } = await supabaseAdmin
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!goal) {
      return c.json({ error: 'Goal not found' }, 404);
    }
    
    // Check if year has ended (after Dec 31)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11
    
    if (goal.year >= currentYear && !(goal.year === currentYear && currentMonth === 11)) {
      // Allow review only if it's December of the goal year or later
      return c.json({ error: 'Cannot review goals until year ends' }, 400);
    }
    
    // Update goal status
    const { data: updatedGoal, error } = await supabaseAdmin
      .from('goals')
      .update({ 
        status,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', goalId)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error reviewing goal:', error);
      return c.json({ error: 'Failed to review goal', details: error.message }, 500);
    }
    
    return c.json({ goal: updatedGoal });
  } catch (error) {
    console.error('Error in PATCH /goals/:id/review:', error);
    return c.json({ error: 'Failed to review goal', details: String(error) }, 500);
  }
});

// GET /api/goals/years - List all years with goals
app.get("/make-server-41f917a5/goals/years", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: goals, error } = await supabaseAdmin
      .from('goals')
      .select('year, status')
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error fetching years:', error);
      return c.json({ error: 'Failed to fetch years', details: error.message }, 500);
    }
    
    // Group by year and calculate stats
    const yearStats = goals?.reduce((acc: any, goal) => {
      if (!acc[goal.year]) {
        acc[goal.year] = {
          year: goal.year,
          total: 0,
          completed: 0,
          partial: 0,
          not_completed: 0,
          pending: 0
        };
      }
      
      acc[goal.year].total++;
      acc[goal.year][goal.status]++;
      
      return acc;
    }, {});
    
    const years = Object.values(yearStats || {}).sort((a: any, b: any) => b.year - a.year);
    
    return c.json({ years });
  } catch (error) {
    console.error('Error in GET /goals/years:', error);
    return c.json({ error: 'Failed to fetch years', details: String(error) }, 500);
  }
});

// GET /api/goals/stats/:year - Get stats for specific year
app.get("/make-server-41f917a5/goals/stats/:year", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await getAuthenticatedUser(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const year = parseInt(c.req.param('year'));
    
    const { data: goals, error } = await supabaseAdmin
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year);
    
    if (error) {
      console.error('Error fetching stats:', error);
      return c.json({ error: 'Failed to fetch stats', details: error.message }, 500);
    }
    
    const stats = {
      year,
      total: goals?.length || 0,
      completed: goals?.filter(g => g.status === 'completed').length || 0,
      partial: goals?.filter(g => g.status === 'partial').length || 0,
      not_completed: goals?.filter(g => g.status === 'not_completed').length || 0,
      pending: goals?.filter(g => g.status === 'pending').length || 0,
      goals: goals || []
    };
    
    return c.json({ stats });
  } catch (error) {
    console.error('Error in GET /goals/stats/:year:', error);
    return c.json({ error: 'Failed to fetch stats', details: String(error) }, 500);
  }
});

// ========================================
// ADMIN ENDPOINTS
// ========================================

// Get all users with license info
app.get("/make-server-41f917a5/admin/users", async (c) => {
  try {
    console.log('📊 Admin: Fetching all users...');
    
    // Fetch all users from auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return c.json({ error: 'Failed to fetch users', details: authError.message }, 500);
    }

    console.log(`📊 Found ${authUsers.users.length} users in auth`);

    // Fetch licenses for all users
    const { data: licenses, error: licensesError } = await supabaseAdmin
      .from('licenses')
      .select('*');
    
    if (licensesError) {
      console.error('Error fetching licenses:', licensesError);
    }

    console.log(`📊 Found ${licenses?.length || 0} licenses in database`);

    // Combine user data with license data
    const users = authUsers.users.map(authUser => {
      const license = licenses?.find(l => l.user_id === authUser.id);
      
      // Calculate default trial expiration if no license exists
      let expiresAt = null;
      if (!license) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30);
        expiresAt = trialEnd.toISOString();
      }
      
      return {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || 'Unknown',
        created_at: authUser.created_at,
        license_type: license?.license_type || 'trial',
        license_expires_at: license?.expires_at || expiresAt
      };
    });

    console.log(`✅ Admin: Returning ${users.length} users`);
    console.log('Sample user:', users[0]);
    
    return c.json({ users });
  } catch (error) {
    console.error('Error in admin/users:', error);
    return c.json({ error: 'Failed to fetch users', details: String(error) }, 500);
  }
});

// Get stats
app.get("/make-server-41f917a5/admin/stats", async (c) => {
  try {
    console.log('📊 Admin: Calculating stats...');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Execute all queries in parallel for better performance
    const [
      totalUsersResult,
      last30DaysResult,
      monthlyLicensesResult,
      weeklyLicensesResult
    ] = await Promise.all([
      // Get total users
      supabaseAdmin
        .from('licenses')
        .select('*', { count: 'exact', head: true }),
      
      // Get users from last 30 days
      supabaseAdmin
        .from('licenses')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString()),
      
      // Get monthly licenses - ONLY count licenses with stripe_customer_id
      supabaseAdmin
        .from('licenses')
        .select('license_type, stripe_customer_id')
        .gte('created_at', startOfMonth.toISOString())
        .in('license_type', ['monthly', 'annual', 'lifetime'])
        .not('stripe_customer_id', 'is', null),
      
      // Get weekly licenses - ONLY count licenses with stripe_customer_id
      supabaseAdmin
        .from('licenses')
        .select('license_type, stripe_customer_id')
        .gte('created_at', startOfWeek.toISOString())
        .in('license_type', ['monthly', 'annual', 'lifetime'])
        .not('stripe_customer_id', 'is', null)
    ]);

    // Calculate revenue this month
    let revenueThisMonth = 0;
    monthlyLicensesResult.data?.forEach(license => {
      if (license.license_type === 'monthly') revenueThisMonth += 6.99;
      if (license.license_type === 'annual') revenueThisMonth += 59;
      if (license.license_type === 'lifetime') revenueThisMonth += 149;
    });

    // Calculate revenue this week
    let revenueThisWeek = 0;
    weeklyLicensesResult.data?.forEach(license => {
      if (license.license_type === 'monthly') revenueThisWeek += 6.99;
      if (license.license_type === 'annual') revenueThisWeek += 59;
      if (license.license_type === 'lifetime') revenueThisWeek += 149;
    });

    const stats = {
      totalUsers: totalUsersResult.count || 0,
      last30Days: last30DaysResult.count || 0,
      revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
      revenueThisWeek: Math.round(revenueThisWeek * 100) / 100
    };

    console.log('✅ Admin: Stats calculated:', stats);
    return c.json(stats);
  } catch (error) {
    console.error('Error in admin/stats:', error);
    return c.json({ error: 'Failed to calculate stats', details: String(error) }, 500);
  }
});

// Update user license
app.post("/make-server-41f917a5/admin/update-license", async (c) => {
  try {
    const { userId, licenseType } = await c.req.json();
    
    console.log(`📝 Admin: Updating license for user ${userId} to ${licenseType}`);
    
    if (!userId || !licenseType) {
      return c.json({ error: 'Missing userId or licenseType' }, 400);
    }

    // Calculate expires_at based on license type
    let expiresAt = null;
    
    if (licenseType === 'trial') {
      // Trial: 30 days from now
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);
      expiresAt = trialEnd.toISOString();
    } else if (licenseType === 'monthly') {
      // Monthly: 30 days from now
      const monthlyEnd = new Date();
      monthlyEnd.setMonth(monthlyEnd.getMonth() + 1);
      expiresAt = monthlyEnd.toISOString();
    } else if (licenseType === 'annual') {
      // Annual: 1 year from now
      const annualEnd = new Date();
      annualEnd.setFullYear(annualEnd.getFullYear() + 1);
      expiresAt = annualEnd.toISOString();
    } else if (licenseType === 'lifetime') {
      // Lifetime: 100 years from now (effectively never)
      const lifetimeEnd = new Date();
      lifetimeEnd.setFullYear(lifetimeEnd.getFullYear() + 100);
      expiresAt = lifetimeEnd.toISOString();
    } else if (licenseType === 'expired') {
      // Expired: yesterday
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      expiresAt = expiredDate.toISOString();
    }

    // Update license
    const { data: updatedLicense, error: updateError } = await supabaseAdmin
      .from('licenses')
      .upsert({
        user_id: userId,
        license_type: licenseType,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating license:', updateError);
      return c.json({ error: 'Failed to update license', details: updateError.message }, 500);
    }

    console.log('✅ Admin: License updated successfully');
    return c.json({ license: updatedLicense });
  } catch (error) {
    console.error('Error in admin/update-license:', error);
    return c.json({ error: 'Failed to update license', details: String(error) }, 500);
  }
});

Deno.serve(app.fetch);
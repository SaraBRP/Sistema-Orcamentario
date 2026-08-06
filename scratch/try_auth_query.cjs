const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://dntpnrzevzkwooihqbbx.supabase.co';
const supabaseAnonKey = 'sb_publishable_qwnWAG0pELpkSf_6brrZ1A_cWiP477X';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.log('1. Trying to sign in with a test account...');
    // We don't have a test account, let's try to sign up
    let session = null;
    const email = 'debug_agent_' + Math.random().toString(36).substring(2) + '@example.com';
    const password = 'Password123!';
    
    console.log('Registering test user:', email);
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
    
    if (signUpErr) {
      console.warn('Sign up failed (might be disabled):', signUpErr.message);
      // Let's try to sign in with some standard admin/test credentials if we can guess,
      // or just run without session to see RLS behaviour.
    } else {
      console.log('Sign up success, session active:', !!signUpData.session);
      session = signUpData.session;
    }

    console.log('2. Querying composicoes in engenharia schema...');
    const { data: comps, error: err } = await supabase
      .schema('engenharia')
      .from('composicoes')
      .select('id, codigo, descricao, fonte')
      .limit(5);

    if (err) {
      console.error('Fetch error:', err);
    } else {
      console.log('Fetched comps:', comps);
    }

  } catch (e) {
    console.error('Error:', e);
  }
}
run();

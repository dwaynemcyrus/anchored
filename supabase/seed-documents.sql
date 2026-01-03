-- ============================================================================
-- SEED DOCUMENTS FOR TESTING
-- Run this in Supabase SQL Editor after replacing YOUR_USER_ID
-- ============================================================================

-- First, get your user_id by running:
-- SELECT id FROM auth.users WHERE email = 'cyrusdwayne@icloud.com';

-- Then replace 'YOUR_USER_ID' below with the actual UUID

DO $$
DECLARE
  owner_id UUID;
BEGIN
  -- Get the user ID for the owner
  SELECT id INTO owner_id FROM auth.users WHERE email = 'cyrusdwayne@icloud.com' LIMIT 1;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Please check the email address.';
  END IF;

  -- Clear existing test documents (optional - comment out if you want to keep existing)
  DELETE FROM documents WHERE user_id = owner_id;

  -- Insert test documents
  INSERT INTO documents (id, user_id, title, slug, collection, visibility, status, body_md, summary, metadata, published_at) VALUES

  -- Essays
  (
    '01HQES001PRINCIPLE001',
    owner_id,
    'Emotional Sovereignty',
    'emotional-sovereignty',
    'essays',
    'public',
    'published',
    E'# Emotional Sovereignty\n\nEmotional sovereignty is the practice of owning your internal state regardless of external circumstances.\n\nThis builds on [[The Practice of Becoming]].\n\n> [!note]\n> This is a core principle that underpins all other work.\n\n## The Foundation\n\nBefore you can lead others, you must first lead yourself. This begins with emotional awareness—the ability to notice what you''re feeling without being controlled by it.\n\n## Key Practices\n\n1. **Name the emotion** before trying to change it\n2. **Create space** between stimulus and response\n3. **Choose your response** rather than react automatically\n\n> [!tip] Pro Tip\n> Start each morning by asking: "What am I feeling right now, and why?"\n\n## Related Ideas\n\nSee also [[On Stillness and Motion]] for the balance between action and reflection.',
    'Core principle for emotional mastery.',
    '{}',
    '2024-01-15T00:00:00Z'
  ),

  (
    '01HQES002PRINCIPLE002',
    owner_id,
    'The Practice of Becoming',
    'the-practice-of-becoming',
    'essays',
    'public',
    'published',
    E'# The Practice of Becoming\n\nBecoming is not a destination but a continuous practice of intentional growth.\n\nThis practice builds on [[Emotional Sovereignty]] and expands through [[Anchored|the system I built]].\n\n> [!tip] Pro Tip\n> Name the moment before you try to change it.\n\n## The Framework\n\nBecoming requires three elements:\n\n1. **Clarity** - knowing where you want to go\n2. **Commitment** - deciding to move toward it daily\n3. **Compassion** - accepting that the path is not linear\n\n## Daily Practice\n\nEach day, ask yourself:\n- Who am I becoming?\n- What did I learn today?\n- What will I do differently tomorrow?\n\n> [!warning]\n> Beware of mistaking motion for progress. Reflection is part of the work.',
    'A framework for deliberate personal growth.',
    '{}',
    '2024-01-12T00:00:00Z'
  ),

  -- Notes
  (
    '01HQES003FRAGMENT001',
    owner_id,
    'On Stillness and Motion',
    'on-stillness-and-motion',
    'notes',
    'public',
    'published',
    E'# On Stillness and Motion\n\nA short fragment about balance and pace.\n\n[[Emotional Sovereignty]] returns when the body quiets.\n\nThere is a rhythm to productive work: periods of intense motion followed by deliberate stillness. Neither state is superior—both are necessary.\n\nThe stillness is not passive. It is active listening, integration, preparation for the next movement.\n\n> [!quote]\n> "In the midst of movement and chaos, keep stillness inside of you." — Deepak Chopra',
    'A fragment on balance and pace.',
    '{}',
    '2024-01-14T00:00:00Z'
  ),

  (
    '01HQES004FRAGMENT002',
    owner_id,
    'Morning Light',
    'morning-light',
    'notes',
    'public',
    'published',
    E'# Morning Light\n\nThe first hour shapes the day.\n\nI''ve learned to guard it fiercely—no email, no news, no input from the outside world until the inner world has been tended to.\n\nThis is when [[Emotional Sovereignty]] is easiest to practice, before the demands of the day erode your attention.',
    'On protecting the first hour.',
    '{}',
    '2024-01-10T00:00:00Z'
  ),

  -- Essays
  (
    '01HQES005PROJECT001',
    owner_id,
    'Anchored: Building a Personal OS',
    'anchored',
    'essays',
    'public',
    'published',
    E'# Anchored: Building a Personal OS\n\nA product and process log for the system that supports this garden.\n\n## What is Anchored?\n\nAnchored is my personal productivity operating system—a place to manage tasks, track time, build habits, and author content.\n\nSee also [[Emotional Sovereignty|the guiding principle]] that shapes how I build.\n\n## Tech Stack\n\n- **Framework:** Next.js 14+ with App Router\n- **Styling:** Tailwind CSS + shadcn/ui\n- **Database:** Supabase (PostgreSQL)\n- **Hosting:** Vercel\n\n## Current Status\n\nPhase 1 complete: Tasks, projects, timer, habits, daily review.\n\n> [!note]\n> This project practices what it preaches—built with [[The Practice of Becoming]] in mind.',
    'A product and process log for Anchored.',
    '{"stack": ["Next.js", "Supabase", "Tailwind"], "repo_url": "https://github.com/dwaynemcyrus/anchored", "live_url": "https://getanchored.app"}',
    '2024-01-10T00:00:00Z'
  ),

  -- Essays
  (
    '01HQES006ESSAY001',
    owner_id,
    'The Examined Life in Practice',
    'examined-life-in-practice',
    'essays',
    'public',
    'published',
    E'# The Examined Life in Practice\n\nSocrates said the unexamined life is not worth living. But what does examination look like in practice?\n\n## Beyond Journaling\n\nExamination is more than writing in a journal. It''s a posture toward experience—curiosity about your own reactions, assumptions, and patterns.\n\nThis connects to [[Emotional Sovereignty]]: you cannot examine what you cannot see, and you cannot see what you''re too reactive to observe.\n\n## A Daily Practice\n\n1. **Morning:** Set intention\n2. **Midday:** Check alignment\n3. **Evening:** Review and learn\n\n> [!example]\n> Today I noticed frustration arising in a meeting. Rather than acting on it, I asked: what expectation was violated? The answer revealed more about me than about the situation.',
    'Practical approaches to self-examination.',
    '{}',
    '2024-01-08T00:00:00Z'
  ),

  -- Notes
  (
    '01HQES007POETRY001',
    owner_id,
    'Before Dawn',
    'before-dawn',
    'notes',
    'public',
    'published',
    E'# Before Dawn\n\nIn the quiet before the world wakes,\nI find the version of myself\nthat remembers why we''re here.\n\nNot for the rushing,\nnot for the noise,\nbut for these moments—\n\nwhen breath is the only sound\nand possibility stretches\nlike light across the horizon.',
    'A poem about morning stillness.',
    '{}',
    '2024-01-05T00:00:00Z'
  ),

  -- Draft document (not published)
  (
    '01HQES008DRAFT001',
    owner_id,
    'Work in Progress',
    'work-in-progress',
    'essays',
    'private',
    'draft',
    E'# Work in Progress\n\nThis is a draft that should not appear on the public site.\n\nStill working through these ideas...',
    'A draft document for testing.',
    '{}',
    NULL
  );

  RAISE NOTICE 'Successfully seeded % documents for user %', 8, owner_id;
END $$;

-- Verify the seed
SELECT id, title, collection, visibility, status, published_at
FROM documents
ORDER BY published_at DESC NULLS LAST;

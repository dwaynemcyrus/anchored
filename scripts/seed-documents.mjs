import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/seed-documents.mjs');
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const OWNER_EMAIL = 'cyrusdwayne@icloud.com';

async function seed() {
  // Get the user ID
  const { data: userData, error: userError } = await supabase.auth.admin.listUsers();

  if (userError) {
    console.error('Error fetching users:', userError);
    process.exit(1);
  }

  const owner = userData.users.find(u => u.email === OWNER_EMAIL);
  if (!owner) {
    console.error(`User not found: ${OWNER_EMAIL}`);
    process.exit(1);
  }

  const userId = owner.id;
  console.log(`Found user: ${OWNER_EMAIL} (${userId})`);

  // Clear existing documents for this user
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error clearing documents:', deleteError);
    process.exit(1);
  }
  console.log('Cleared existing documents');

  // Seed documents
  const documents = [
    {
      id: '01HQES001PRINCIPLE001',
      user_id: userId,
      title: 'Emotional Sovereignty',
      slug: 'emotional-sovereignty',
      content_type: 'principles',
      visibility: 'public',
      status: 'published',
      body_md: `# Emotional Sovereignty

Emotional sovereignty is the practice of owning your internal state regardless of external circumstances.

This builds on [[The Practice of Becoming]].

> [!note]
> This is a core principle that underpins all other work.

## The Foundation

Before you can lead others, you must first lead yourself. This begins with emotional awareness—the ability to notice what you're feeling without being controlled by it.

## Key Practices

1. **Name the emotion** before trying to change it
2. **Create space** between stimulus and response
3. **Choose your response** rather than react automatically

> [!tip] Pro Tip
> Start each morning by asking: "What am I feeling right now, and why?"

## Related Ideas

See also [[On Stillness and Motion]] for the balance between action and reflection.`,
      summary: 'Core principle for emotional mastery.',
      metadata: {},
      published_at: '2024-01-15T00:00:00Z'
    },
    {
      id: '01HQES002PRINCIPLE002',
      user_id: userId,
      title: 'The Practice of Becoming',
      slug: 'the-practice-of-becoming',
      content_type: 'principles',
      visibility: 'public',
      status: 'published',
      body_md: `# The Practice of Becoming

Becoming is not a destination but a continuous practice of intentional growth.

This practice builds on [[Emotional Sovereignty]] and expands through [[Anchored|the system I built]].

> [!tip] Pro Tip
> Name the moment before you try to change it.

## The Framework

Becoming requires three elements:

1. **Clarity** - knowing where you want to go
2. **Commitment** - deciding to move toward it daily
3. **Compassion** - accepting that the path is not linear

## Daily Practice

Each day, ask yourself:
- Who am I becoming?
- What did I learn today?
- What will I do differently tomorrow?

> [!warning]
> Beware of mistaking motion for progress. Reflection is part of the work.`,
      summary: 'A framework for deliberate personal growth.',
      metadata: {},
      published_at: '2024-01-12T00:00:00Z'
    },
    {
      id: '01HQES003FRAGMENT001',
      user_id: userId,
      title: 'On Stillness and Motion',
      slug: 'on-stillness-and-motion',
      content_type: 'fragments',
      visibility: 'public',
      status: 'published',
      body_md: `# On Stillness and Motion

A short fragment about balance and pace.

[[Emotional Sovereignty]] returns when the body quiets.

There is a rhythm to productive work: periods of intense motion followed by deliberate stillness. Neither state is superior—both are necessary.

The stillness is not passive. It is active listening, integration, preparation for the next movement.

> [!quote]
> "In the midst of movement and chaos, keep stillness inside of you." — Deepak Chopra`,
      summary: 'A fragment on balance and pace.',
      metadata: {},
      published_at: '2024-01-14T00:00:00Z'
    },
    {
      id: '01HQES004FRAGMENT002',
      user_id: userId,
      title: 'Morning Light',
      slug: 'morning-light',
      content_type: 'fragments',
      visibility: 'public',
      status: 'published',
      body_md: `# Morning Light

The first hour shapes the day.

I've learned to guard it fiercely—no email, no news, no input from the outside world until the inner world has been tended to.

This is when [[Emotional Sovereignty]] is easiest to practice, before the demands of the day erode your attention.`,
      summary: 'On protecting the first hour.',
      metadata: {},
      published_at: '2024-01-10T00:00:00Z'
    },
    {
      id: '01HQES005PROJECT001',
      user_id: userId,
      title: 'Anchored: Building a Personal OS',
      slug: 'anchored',
      content_type: 'projects',
      visibility: 'public',
      status: 'published',
      body_md: `# Anchored: Building a Personal OS

A product and process log for the system that supports this garden.

## What is Anchored?

Anchored is my personal productivity operating system—a place to manage tasks, track time, build habits, and author content.

See also [[Emotional Sovereignty|the guiding principle]] that shapes how I build.

## Tech Stack

- **Framework:** Next.js 14+ with App Router
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel

## Current Status

Phase 1 complete: Tasks, projects, timer, habits, daily review.

> [!note]
> This project practices what it preaches—built with [[The Practice of Becoming]] in mind.`,
      summary: 'A product and process log for Anchored.',
      metadata: {
        stack: ['Next.js', 'Supabase', 'Tailwind'],
        repo_url: 'https://github.com/dwaynemcyrus/anchored',
        live_url: 'https://getanchored.app'
      },
      published_at: '2024-01-10T00:00:00Z'
    },
    {
      id: '01HQES006ESSAY001',
      user_id: userId,
      title: 'The Examined Life in Practice',
      slug: 'examined-life-in-practice',
      content_type: 'essays',
      visibility: 'public',
      status: 'published',
      body_md: `# The Examined Life in Practice

Socrates said the unexamined life is not worth living. But what does examination look like in practice?

## Beyond Journaling

Examination is more than writing in a journal. It's a posture toward experience—curiosity about your own reactions, assumptions, and patterns.

This connects to [[Emotional Sovereignty]]: you cannot examine what you cannot see, and you cannot see what you're too reactive to observe.

## A Daily Practice

1. **Morning:** Set intention
2. **Midday:** Check alignment
3. **Evening:** Review and learn

> [!example]
> Today I noticed frustration arising in a meeting. Rather than acting on it, I asked: what expectation was violated? The answer revealed more about me than about the situation.`,
      summary: 'Practical approaches to self-examination.',
      metadata: {},
      published_at: '2024-01-08T00:00:00Z'
    },
    {
      id: '01HQES007POETRY001',
      user_id: userId,
      title: 'Before Dawn',
      slug: 'before-dawn',
      content_type: 'poetry',
      visibility: 'public',
      status: 'published',
      body_md: `# Before Dawn

In the quiet before the world wakes,
I find the version of myself
that remembers why we're here.

Not for the rushing,
not for the noise,
but for these moments—

when breath is the only sound
and possibility stretches
like light across the horizon.`,
      summary: 'A poem about morning stillness.',
      metadata: {},
      published_at: '2024-01-05T00:00:00Z'
    },
    {
      id: '01HQES008DRAFT001',
      user_id: userId,
      title: 'Work in Progress',
      slug: 'work-in-progress',
      content_type: 'essays',
      visibility: 'private',
      status: 'draft',
      body_md: `# Work in Progress

This is a draft that should not appear on the public site.

Still working through these ideas...`,
      summary: 'A draft document for testing.',
      metadata: {},
      published_at: null
    }
  ];

  const { data, error } = await supabase
    .from('documents')
    .insert(documents)
    .select();

  if (error) {
    console.error('Error inserting documents:', error);
    process.exit(1);
  }

  console.log(`\nSuccessfully seeded ${data.length} documents:\n`);
  data.forEach(doc => {
    console.log(`  - ${doc.title} (${doc.content_type}, ${doc.status})`);
  });
}

seed();

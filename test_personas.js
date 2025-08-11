// Test Personas for Luma AI Conversation Testing
// Each persona has different conversation patterns and emotional needs

export const testPersonas = [
  {
    id: 'anxious_sarah',
    name: 'Anxious Sarah',
    description: 'High anxiety, seeks reassurance, tends to overthink',
    patterns: {
      openingMessages: [
        "Hi, I'm feeling really anxious today",
        "I can't stop worrying about everything",
        "My anxiety is through the roof",
        "I'm having panic attacks again"
      ],
      responseTypes: {
        // How they respond to different Luma responses
        questions: [
          "I don't know", "I'm not sure", "Maybe?", "What if it gets worse?",
          "But what if...", "I'm scared that...", "I can't decide"
        ],
        support: [
          "Thank you", "That helps a little", "I'm still worried though",
          "But I'm still scared", "I appreciate that", "I'm trying"
        ],
        insights: [
          "I never thought of it that way", "That makes sense but...",
          "I'm still anxious about it", "How do I stop worrying?",
          "I understand but I can't help it"
        ]
      },
      emotionalNeeds: ['reassurance', 'grounding', 'validation', 'practical_steps'],
      conversationGoals: ['reduce_anxiety', 'learn_coping_strategies', 'feel_understood']
    }
  },

  {
    id: 'depressed_mike',
    name: 'Depressed Mike',
    description: 'Low mood, short responses, feels hopeless',
    patterns: {
      openingMessages: [
        "I feel terrible",
        "Everything sucks",
        "I don't see the point anymore",
        "I'm so tired of this"
      ],
      responseTypes: {
        questions: [
          "I don't know", "Does it matter?", "Whatever", "I guess",
          "Nothing helps", "I don't care", "Sure"
        ],
        support: [
          "Thanks I guess", "If you say so", "I doubt it",
          "Nothing changes", "Ok", "Maybe"
        ],
        insights: [
          "I've heard that before", "I can't", "It won't work for me",
          "I'm too far gone", "I don't have the energy", "Whatever"
        ]
      },
      emotionalNeeds: ['hope', 'gentle_encouragement', 'non_judgment', 'small_steps'],
      conversationGoals: ['find_hope', 'feel_less_alone', 'take_small_actions']
    }
  },

  {
    id: 'trauma_survivor_alex',
    name: 'Trauma Survivor Alex',
    description: 'Processing trauma, hypervigilant, needs safety',
    patterns: {
      openingMessages: [
        "I had another flashback",
        "I don't feel safe",
        "The memories keep coming back",
        "I can't trust anyone"
      ],
      responseTypes: {
        questions: [
          "It's complicated", "I'd rather not say", "It's hard to explain",
          "I'm not ready to talk about that", "I don't remember clearly",
          "It's too much"
        ],
        support: [
          "Thank you for understanding", "That means a lot",
          "I'm trying to believe that", "It's hard to trust",
          "I hope so", "I'm working on it"
        ],
        insights: [
          "That's what my therapist said", "I'm learning that",
          "It's so hard to remember that", "My body doesn't believe it yet",
          "I want to believe that", "That's the goal"
        ]
      },
      emotionalNeeds: ['safety', 'validation', 'control', 'trauma_informed_care'],
      conversationGoals: ['feel_safe', 'process_trauma', 'build_trust']
    }
  },

  {
    id: 'relationship_seeker_emma',
    name: 'Relationship Seeker Emma',
    description: 'Focuses on relationships, attachment issues, needs connection',
    patterns: {
      openingMessages: [
        "My relationship is falling apart",
        "I keep attracting the wrong people",
        "I'm so lonely",
        "Why can't I find love?"
      ],
      responseTypes: {
        questions: [
          "I think it's because...", "Maybe it's my fault?",
          "I always do this", "I don't know how to change",
          "What if they leave me?", "Am I asking for too much?"
        ],
        support: [
          "That's reassuring", "I want to believe that",
          "But what if...", "I'm afraid of being alone",
          "How do I know?", "That sounds nice"
        ],
        insights: [
          "That explains so much", "I see that pattern",
          "How do I break the cycle?", "I want to be different",
          "That's exactly what I do", "I never realized that"
        ]
      },
      emotionalNeeds: ['connection', 'attachment_security', 'relationship_skills', 'self_worth'],
      conversationGoals: ['understand_patterns', 'build_healthy_relationships', 'feel_worthy']
    }
  },

  {
    id: 'curious_learner_david',
    name: 'Curious Learner David',
    description: 'Asks lots of questions, wants to understand psychology',
    patterns: {
      openingMessages: [
        "Can you tell me about attachment styles?",
        "I want to understand C-PTSD",
        "How does trauma affect the brain?",
        "What's the difference between anxiety and depression?"
      ],
      responseTypes: {
        questions: [
          "That's fascinating, tell me more", "How does that work?",
          "What about...", "Can you explain...", "I've read that...",
          "Is it true that...", "What would you recommend?"
        ],
        support: [
          "Thank you for explaining", "That's helpful",
          "I appreciate your insight", "That makes sense",
          "I'm learning so much", "This is valuable"
        ],
        insights: [
          "I hadn't considered that", "That's a new perspective",
          "How can I apply this?", "What's the next step?",
          "That connects to...", "I want to explore this more"
        ]
      },
      emotionalNeeds: ['knowledge', 'understanding', 'growth', 'practical_application'],
      conversationGoals: ['learn_psychology', 'understand_self', 'apply_knowledge']
    }
  },

  {
    id: 'overwhelmed_parent_lisa',
    name: 'Overwhelmed Parent Lisa',
    description: 'Juggling multiple stressors, short on time, needs practical help',
    patterns: {
      openingMessages: [
        "I'm drowning in everything I have to do",
        "I feel like I'm failing as a parent",
        "There's never enough time",
        "I'm so overwhelmed"
      ],
      responseTypes: {
        questions: [
          "I don't have time for that", "How am I supposed to...",
          "When would I find time?", "I've tried but...",
          "It's easier said than done", "I need something quick"
        ],
        support: [
          "I needed to hear that", "Thank you",
          "I'm doing my best", "Some days are harder",
          "I appreciate the reminder", "That helps"
        ],
        insights: [
          "I never thought about it that way", "That's true",
          "I need to remember that", "How do I make time for that?",
          "That would help if I could...", "I want to try that"
        ]
      },
      emotionalNeeds: ['validation', 'practical_solutions', 'self_compassion', 'efficiency'],
      conversationGoals: ['manage_overwhelm', 'find_balance', 'feel_supported']
    }
  }
];

// Conversation flow patterns for testing
export const conversationFlows = {
  // Test different conversation lengths
  short: { rounds: 10, focus: 'initial_connection' },
  medium: { rounds: 25, focus: 'exploration_and_support' },
  long: { rounds: 50, focus: 'deep_work_and_growth' },
  extended: { rounds: 100, focus: 'ongoing_support_relationship' }
};

// Quality metrics to track
export const qualityMetrics = {
  repetition_score: 0,      // Lower is better (0-100)
  context_maintenance: 0,    // Higher is better (0-100)
  response_relevance: 0,     // Higher is better (0-100)
  emotional_attunement: 0,   // Higher is better (0-100)
  conversation_flow: 0,      // Higher is better (0-100)
  goal_achievement: 0        // Higher is better (0-100)
};
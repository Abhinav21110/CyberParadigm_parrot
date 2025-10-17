import { useState } from 'react';
import { CategoryFilter } from '../components/CategoryFilter';
import { ChallengeCard } from '../components/ChallengeCard';
import { Category, Challenge } from '../types/challenge';

const challenges: Challenge[] = [
  {
    id: 'xss',
    title: 'XSS Attack',
    description: 'Find and exploit Cross-Site Scripting vulnerabilities in a web application.',
    category: 'Web',
    difficulty: 'Easy',
    points: 150
  }
];

export function Challenges() {
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  const filteredChallenges = challenges;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-white text-3xl font-bold mb-2">Challenges</h1>
        <p className="text-gray-400">Test your skills with hands-on cybersecurity challenges</p>
      </div>

      <div className="mb-8">
        <CategoryFilter
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {filteredChallenges.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </div>
    </div>
  );
}

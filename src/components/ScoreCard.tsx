import React from 'react';

interface ScoreCardProps {
  score: number; // This will be the userAdjustedScore
  originalScore?: number; // Original AI score, optional
}

const ScoreCard: React.FC<ScoreCardProps> = ({ score, originalScore }) => {
  const getScorePresentation = (s: number): { colorClass: string; textColorClass: string; label: string } => {
    if (s >= 85) return { colorClass: 'bg-green-500', textColorClass: 'text-green-600', label: 'Excellent' };
    if (s >= 70) return { colorClass: 'bg-yellow-500', textColorClass: 'text-yellow-600', label: 'Good' };
    if (s >= 50) return { colorClass: 'bg-orange-500', textColorClass: 'text-orange-600', label: 'Fair' };
    return { colorClass: 'bg-red-500', textColorClass: 'text-red-600', label: 'Needs Improvement' };
  };

  const { colorClass, textColorClass, label } = getScorePresentation(score);
  const displayScore = Math.round(score); // Display rounded score
  const displayOriginalScore = originalScore !== undefined ? Math.round(originalScore) : undefined;

  const showOriginal = displayOriginalScore !== undefined && displayOriginalScore !== displayScore;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg text-center transition-all duration-500 ease-in-out transform hover:scale-105">
      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        {showOriginal ? "Adjusted Code Quality" : "Overall Code Quality"}
      </h3>
      <div className="relative w-36 h-36 mx-auto my-4">
        <svg className="w-full h-full" viewBox="0 0 36 36">
          <path
            className="text-gray-200"
            strokeWidth="3.8"
            fill="none"
            stroke="currentColor"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={colorClass.replace('bg-', 'text-')} 
            strokeWidth="3.8"
            strokeDasharray={`${displayScore}, 100`}
            strokeLinecap="round"
            fill="none"
            stroke="currentColor"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-4xl font-bold ${textColorClass}`}>
          {displayScore}
        </div>
      </div>
      <p className={`text-lg font-semibold ${textColorClass}`}>{label}</p>
      {showOriginal && displayOriginalScore !== undefined && (
        <p className="mt-1 text-sm text-gray-500">
          (Original AI Score: {displayOriginalScore})
        </p>
      )}
       <p className={`mt-1 text-sm text-gray-500 ${showOriginal ? '' : 'invisible'}`}>
        Score adjusted by user.
      </p>
    </div>
  );
};

export default ScoreCard;
import React from 'react';

const SkeletonLoader = () => {
  return (
    <div className="min-h-screen bg-brand-lightest flex flex-col w-full">
      {/* Header Skeleton */}
      <div className="h-20 glass border-b border-brand-sage/30 px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-10">
          <div className="w-10 h-10 bg-brand-sage/20 rounded-xl animate-pulse"></div>
          <div className="w-32 h-6 bg-brand-sage/20 rounded-md animate-pulse"></div>
        </div>
        <div className="hidden md:block flex-1 max-w-xl px-8 w-full">
          <div className="w-full h-12 bg-brand-sage/20 rounded-2xl animate-pulse"></div>
        </div>
        <div className="flex items-center gap-6">
          <div className="w-10 h-10 bg-brand-sage/20 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Body Skeleton */}
      <div className="flex-1 p-8 space-y-8 w-full max-w-[1600px] mx-auto">
        {/* Map Area Skeleton */}
        <div className="w-full h-[400px] bg-brand-sage/20 rounded-[2.5rem] animate-pulse"></div>
        
        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-brand-sage/20 rounded-3xl animate-pulse"></div>
          ))}
        </div>

        {/* Bottom Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-[450px] lg:col-span-2 bg-brand-sage/20 rounded-3xl animate-pulse"></div>
          <div className="h-[450px] bg-brand-sage/20 rounded-3xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonLoader;

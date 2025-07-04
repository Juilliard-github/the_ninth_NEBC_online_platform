import * as React from 'react';

interface AvatarProps {
  className?: string;
  children?: React.ReactNode;
}

export const Avatar: React.FC<AvatarProps> = ({ className, children }) => {
  return (
    <div
      className={`inline-flex items-center justify-center overflow-hidden rounded-full ${className}`}
    >
      {children}
    </div>
  );
};

interface AvatarImageProps {
  src: string;
  alt?: string;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({ src, alt = 'User Avatar' }) => {
  return src ? (
    <img src={src} alt={alt} className="object-cover w-full h-full" />
  ) : (
    <AvatarFallback>{alt.slice(0, 2).toUpperCase()}</AvatarFallback> // 顯示 fallback 文字
  )
};

interface AvatarFallbackProps {
  children: React.ReactNode;
}

export const AvatarFallback: React.FC<AvatarFallbackProps> = ({ children }) => {
  return (
    <div className="flex items-center justify-center w-full h-full bg-gray-300 text-white text-lg">
      {children}
    </div>
  );
};

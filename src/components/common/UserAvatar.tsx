import React, { useRef } from 'react';
import { Camera } from 'lucide-react';

interface UserAvatarProps {
  avatar: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showCameraBadge?: boolean;
  onCameraClick?: () => void;
  onImageSelected?: (base64: string) => void;
  isDarkMode?: boolean;
}

export const isImageUrl = (val: string | null | undefined): boolean => {
  if (!val) return false;
  return val.startsWith('data:image/') || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/uploads/');
};

export default function UserAvatar({
  avatar,
  name = 'User',
  size = 'md',
  className = '',
  showCameraBadge = false,
  onCameraClick,
  onImageSelected,
  isDarkMode = true
}: UserAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-base',
    lg: 'w-12 h-12 text-xl',
    xl: 'w-16 h-16 text-2xl sm:w-20 sm:h-20 sm:text-3xl'
  }[size];

  const cameraBadgeSize = {
    sm: 'w-4 h-4 p-0.5 -bottom-0.5 -right-0.5',
    md: 'w-5 h-5 p-1 -bottom-0.5 -right-0.5',
    lg: 'w-6 h-6 p-1.5 bottom-0 right-0',
    xl: 'w-7 h-7 p-1.5 bottom-0.5 right-0.5'
  }[size];

  const isImage = isImageUrl(avatar);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageSelected) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result && typeof reader.result === 'string') {
          onImageSelected(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCameraClick) {
      onCameraClick();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <div
        className={`${sizeClasses} rounded-full overflow-hidden flex items-center justify-center font-black select-none border-2 transition-transform shadow-xs ${
          isDarkMode 
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200' 
            : 'bg-emerald-100 border-emerald-400 text-[#113C24]'
        }`}
      >
        {isImage ? (
          <img
            src={avatar}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{avatar || '👤'}</span>
        )}
      </div>

      {showCameraBadge && (
        <>
          <button
            type="button"
            onClick={handleCameraClick}
            className={`absolute ${cameraBadgeSize} rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center justify-center border-2 ${
              isDarkMode ? 'border-[#061A10]' : 'border-white'
            } cursor-pointer transition-all hover:scale-110 active:scale-95`}
            title="Upload or change profile picture"
          >
            <Camera className="w-full h-full" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
}

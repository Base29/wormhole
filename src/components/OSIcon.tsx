import { Server } from "lucide-react";

interface OSIconProps {
  os?: string;
  size?: number;
  className?: string;
}

export default function OSIcon({ os, size = 13, className = "" }: OSIconProps) {
  const normOs = os?.toLowerCase().trim() || "";

  // Brand gradients and SVG assets
  switch (normOs) {
    case "ubuntu":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} transition-transform duration-300 hover:scale-115`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ubuntu-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff6333" />
              <stop offset="100%" stopColor="#e95420" />
            </linearGradient>
          </defs>
          {/* Ubuntu Circle of Friends styled */}
          <circle cx="12" cy="12" r="11" fill="url(#ubuntu-grad)" />
          {/* Inner Friends elements */}
          <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="1.5" />
          <circle cx="12" cy="7" r="1.5" fill="white" />
          <circle cx="7.7" cy="14.5" r="1.5" fill="white" />
          <circle cx="16.3" cy="14.5" r="1.5" fill="white" />
          <path d="M12 7.5L12 9.5" stroke="white" strokeWidth="1" />
          <path d="M8.2 14.1L9.9 13.1" stroke="white" strokeWidth="1" />
          <path d="M15.8 14.1L14.1 13.1" stroke="white" strokeWidth="1" />
        </svg>
      );

    case "raspbian":
    case "raspberry":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} transition-transform duration-300 hover:scale-115`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="berry-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff2a6d" />
              <stop offset="100%" stopColor="#c51a4a" />
            </linearGradient>
            <linearGradient id="leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8be9fd" />
              <stop offset="100%" stopColor="#50fa7b" />
            </linearGradient>
          </defs>
          {/* Raspberry Pi OS Logo stylized */}
          {/* Green leaves at the top */}
          <path
            d="M12 2C11 4 9 4.5 9 6.5C9 7.5 10 8 12 7C14 8 15 7.5 15 6.5C15 4.5 13 4 12 2Z"
            fill="url(#leaf-grad)"
          />
          <path
            d="M12 4C10 5 8 4 6 6C8 7 10 7 10 8C10 9 11 9 12 7.5C13 9 14 9 14 8C14 7 16 7 18 6C16 4 14 5 12 4Z"
            fill="url(#leaf-grad)"
          />
          {/* Red Berry Body */}
          <path
            d="M12 8C10.2 8 8.5 9.2 8 11C7.5 12.8 8.2 14.8 9.5 16C10.5 17 11 18.5 12 21C13 18.5 13.5 17 14.5 16C15.8 14.8 16.5 12.8 16 11C15.5 9.2 13.8 8 12 8Z"
            fill="url(#berry-grad)"
          />
          {/* Berry drupelet segments details (little dots for premium texture) */}
          <circle cx="12" cy="11" r="1.2" fill="#ff79c6" opacity="0.6" />
          <circle cx="10" cy="13" r="1" fill="#ff79c6" opacity="0.6" />
          <circle cx="14" cy="13" r="1" fill="#ff79c6" opacity="0.6" />
          <circle cx="12" cy="15" r="1" fill="#ff79c6" opacity="0.6" />
        </svg>
      );

    case "debian":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} transition-transform duration-300 hover:scale-115`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="debian-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4b72" />
              <stop offset="100%" stopColor="#d70a53" />
            </linearGradient>
          </defs>
          {/* Debian Swirl */}
          <path
            d="M12.2 2C8.5 2 5.5 4.5 4.5 8C3.5 11.5 5 15.5 8 17.5C11 19.5 15 19 17.5 16.5C19.5 14.5 20 11.5 19 9C18.5 7.5 17 6.5 15.5 7C14 7.5 13.2 9 13.7 10.5C14.2 12 13.5 13.5 12 14C10.5 14.5 9 13.7 8.5 12.2C8 10.7 8.7 9.2 10.2 8.7C11.2 8.4 12.2 8.9 12.7 9.7C13.2 10.5 14.2 10.5 14.7 9.7C15.2 8.9 14.7 7.4 13.7 6.7C11.7 5.2 9 5.7 7.7 7.7C6.4 9.7 6.9 12.4 8.9 13.7C10.9 15 13.6 14.5 14.9 12.5C15.9 11 16.9 8.5 15.9 5.7C14.9 3.5 13.2 2.5 12.2 2Z"
            fill="url(#debian-grad)"
          />
        </svg>
      );

    case "fedora":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} transition-transform duration-300 hover:scale-115`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="fedora-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#51a2da" />
              <stop offset="100%" stopColor="#3c6eb4" />
            </linearGradient>
          </defs>
          <rect width="22" height="22" x="1" y="1" rx="5" fill="url(#fedora-grad)" />
          {/* Elegant Fedora infinity/f symbol */}
          <path
            d="M13.5 7C12.5 7 11.8 7.6 11.5 8.5C11.2 9 11 10.2 11 11.5V17H13.2V13H15.2V11H13.2V9.5C13.2 9.2 13.3 9 13.5 9C13.7 9 14 9.2 14 9.5V11H16V9.5C16 8 14.9 7 13.5 7Z"
            fill="white"
          />
          <path
            d="M10.5 17C11.5 17 12.2 16.4 12.5 15.5C12.8 15 13 13.8 13 12.5V7H10.8V11H8.8V13H10.8V14.5C10.8 14.8 10.7 15 10.5 15C10.3 15 10 14.8 10 14.5V13H8V14.5C8 16 9.1 17 10.5 17Z"
            fill="white"
            opacity="0.8"
          />
        </svg>
      );

    case "redhat":
    case "centos":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} transition-transform duration-300 hover:scale-115`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="redhat-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff3333" />
              <stop offset="100%" stopColor="#cc0000" />
            </linearGradient>
          </defs>
          {/* Stylized Red Hat silhouette */}
          <path
            d="M12 3C8.5 3 4.5 5.5 3.5 8.5C3.2 9.5 3 10.5 3.5 11.5C4 12.5 5.5 13 7.5 13C8.5 13 10 12.5 11.5 12C12.5 11.5 13.5 11.5 14.5 12C16 12.5 17.5 13 18.5 13C20.5 13 22 12.5 22.5 11.5C23 10.5 22.8 9.5 22.5 8.5C21.5 5.5 17.5 3 12 3Z"
            fill="url(#redhat-grad)"
          />
          {/* Hat brim line */}
          <path
            d="M2 13C4 14.5 8 15.5 12 15.5C16 15.5 20 14.5 22 13C23 14 22.5 15.5 20.5 16.5C18.5 17.5 15.5 18 12 18C8.5 18 5.5 17.5 3.5 16.5C1.5 15.5 1 14 2 13Z"
            fill="url(#redhat-grad)"
            opacity="0.8"
          />
        </svg>
      );

    case "arch":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} transition-transform duration-300 hover:scale-115`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="arch-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1793d1" />
              <stop offset="100%" stopColor="#075c85" />
            </linearGradient>
          </defs>
          {/* Sleek Arch Linux Mountain Logo */}
          <path
            d="M12 3L3 19.5H7.5L12 11L16.5 19.5H21L12 3Z"
            fill="url(#arch-grad)"
          />
          {/* Stylized Arch cutout/arch curve */}
          <path
            d="M12 5.5L6.5 16C9 14.5 11.5 14.5 12 14.5C12.5 14.5 15 14.5 17.5 16L12 5.5Z"
            fill="#8be9fd"
            opacity="0.8"
          />
          <path
            d="M12 9.5C10.5 11.5 8.5 13 6 13.5C8 12.5 10 11 12 9.5Z"
            fill="white"
            opacity="0.9"
          />
        </svg>
      );

    case "alpine":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} transition-transform duration-300 hover:scale-115`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="alpine-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00aeef" />
              <stop offset="100%" stopColor="#0d597f" />
            </linearGradient>
          </defs>
          {/* Alpine Mountain Peaks */}
          <path
            d="M12 4L4 18H8L12 11L16 18H20L12 4Z"
            fill="url(#alpine-grad)"
          />
          {/* White mountain snowcaps */}
          <path
            d="M12 4L9.5 8.3L11 9L12 7.5L13 9L14.5 8.3L12 4Z"
            fill="white"
          />
          <path
            d="M7 12.7L4 18H8L7 16L7.8 15L7 12.7Z"
            fill="#8be9fd"
            opacity="0.8"
          />
          <path
            d="M17 12.7L20 18H16L17 16L16.2 15L17 12.7Z"
            fill="#8be9fd"
            opacity="0.8"
          />
        </svg>
      );

    case "macos":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} transition-transform duration-300 hover:scale-115`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="macos-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8f8f2" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#6272a4" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          {/* Premium Apple Logo Silhouette */}
          <path
            d="M18.7 12.4C18.7 9.8 20.8 8.5 20.9 8.4C19.7 6.7 17.9 6.4 17.3 6.4C15.8 6.2 14.3 7.3 13.5 7.3C12.7 7.3 11.5 6.4 10.2 6.4C8.6 6.4 7.0 7.3 6.2 8.8C4.5 11.7 5.8 16.0 7.4 18.4C8.2 19.5 9.1 20.8 10.3 20.7C11.5 20.7 11.9 20.0 13.3 20.0C14.7 20.0 15.1 20.7 16.3 20.7C17.5 20.7 18.3 19.6 19.1 18.4C20.0 17.1 20.4 15.8 20.4 15.7C20.3 15.7 18.7 15.1 18.7 12.4Z"
            fill="url(#macos-grad)"
          />
          <path
            d="M15.8 4.3C16.4 3.5 16.9 2.4 16.7 1.3C15.8 1.3 14.6 1.9 14.0 2.7C13.5 3.3 13.0 4.4 13.2 5.5C14.2 5.5 15.3 4.9 15.8 4.3Z"
            fill="url(#macos-grad)"
          />
        </svg>
      );

    case "linux":
      return (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={`${className} transition-transform duration-300 hover:scale-115`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="linux-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#44475a" />
              <stop offset="100%" stopColor="#21222c" />
            </linearGradient>
          </defs>
          {/* Sleek Tux Silhouette */}
          <circle cx="12" cy="12" r="11" fill="url(#linux-grad)" />
          {/* Tux White Belly */}
          <ellipse cx="12" cy="14" rx="5" ry="6" fill="#f8f8f2" />
          {/* Eyes */}
          <circle cx="10" cy="8" r="1.2" fill="#21222c" />
          <circle cx="14" cy="8" r="1.2" fill="#21222c" />
          <circle cx="9.8" cy="7.8" r="0.4" fill="white" />
          <circle cx="13.8" cy="7.8" r="0.4" fill="white" />
          {/* Yellow Beak */}
          <path d="M11 9L13 9L12 11.5L11 9Z" fill="#f1fa8c" />
          {/* Feet */}
          <path d="M7 20C8.5 20 9.5 18.5 9 17L7 20Z" fill="#ffb86c" />
          <path d="M17 20C15.5 20 14.5 18.5 15 17L17 20Z" fill="#ffb86c" />
        </svg>
      );

    default:
      // Fallback: standard Lucide Server icon with a beautiful default purple brand color
      return <Server size={size} className={`${className} text-purple-400/80`} />;
  }
}

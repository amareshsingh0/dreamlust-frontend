/**
 * Localized Video Player Component
 * Video player with subtitle support based on user language preference
 */

import { useState, useEffect, useRef } from 'react';
import { VideoPlayer } from './VideoPlayer';
import { SubtitleSettings } from '@/components/localization/SubtitleSettings';
import { useLocale } from '@/contexts/LocaleContext';
import { LANGUAGE_NAMES } from '@/lib/preferences/constants';

interface VideoPlayerLocalizedProps {
  contentId: string;
  videoUrl: string;
  poster?: string;
  autoplay?: boolean;
  onProductInfo?: (productId: string) => void;
  className?: string;
  subtitleTracks?: Array<{
    src: string;
    srcLang: string;
    label: string;
    default?: boolean;
  }>;
}

export function VideoPlayerLocalized({
  contentId: _contentId,
  videoUrl,
  poster,
  autoplay,
  onProductInfo: _onProductInfo,
  className,
  subtitleTracks = [],
}: VideoPlayerLocalizedProps) {
  const { language } = useLocale();
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('off');
  const [subtitleSettings, setSubtitleSettings] = useState({
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    textColor: '#FFFFFF',
    backgroundColor: '#000000',
    opacity: 80,
  });
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Auto-select subtitle in user's language if available
    const userLanguageSubtitle = subtitleTracks.find(track => track.srcLang === language);
    if (userLanguageSubtitle) {
      setSelectedSubtitle(language);
    }
  }, [language, subtitleTracks]);

  const availableSubtitleLanguages = subtitleTracks.map(track => track.srcLang);

  // Apply subtitle styles to video element
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const tracks = video.querySelectorAll('track');
      
      tracks.forEach((trackEl) => {
        const track = trackEl as HTMLTrackElement;
        if (track.kind === 'subtitles') {
          const trackElement = track as any;
          if (trackElement.track) {
            // Apply subtitle styles via CSS
            const style = document.createElement('style');
            style.id = 'subtitle-styles';
            style.textContent = `
              video::cue {
                font-size: ${subtitleSettings.fontSize === 'small' ? '14px' : subtitleSettings.fontSize === 'large' ? '20px' : '16px'};
                color: ${subtitleSettings.textColor};
                background-color: ${subtitleSettings.backgroundColor};
                opacity: ${subtitleSettings.opacity / 100};
              }
            `;
            
            // Remove existing style if any
            const existingStyle = document.getElementById('subtitle-styles');
            if (existingStyle) {
              existingStyle.remove();
            }
            
            document.head.appendChild(style);
          }
        }
      });
    }
  }, [subtitleSettings, selectedSubtitle]);


  return (
    <div className={`space-y-4 ${className}`}>
      <VideoPlayer
        src={videoUrl}
        poster={poster}
        autoplay={autoplay}
        className="relative"
        videoRef={videoRef}
        subtitleTracks={subtitleTracks}
      />

      {/* Subtitle Settings */}
      {availableSubtitleLanguages.length > 0 && (
        <SubtitleSettings
          availableLanguages={availableSubtitleLanguages}
          selectedLanguage={selectedSubtitle === 'off' ? undefined : selectedSubtitle}
          onLanguageChange={(lang) => {
            setSelectedSubtitle(lang);
            // Enable/disable subtitle tracks
            if (videoRef.current) {
              const tracks = videoRef.current.querySelectorAll('track');
              tracks.forEach((trackEl) => {
                const track = trackEl as any;
                if (track.kind === 'subtitles') {
                  track.mode = lang === 'off' ? 'hidden' : (track.srclang === lang ? 'showing' : 'hidden');
                }
              });
            }
          }}
          fontSize={subtitleSettings.fontSize}
          onFontSizeChange={(size) => setSubtitleSettings({ ...subtitleSettings, fontSize: size })}
          textColor={subtitleSettings.textColor}
          onTextColorChange={(color) => setSubtitleSettings({ ...subtitleSettings, textColor: color })}
          backgroundColor={subtitleSettings.backgroundColor}
          onBackgroundColorChange={(color) => setSubtitleSettings({ ...subtitleSettings, backgroundColor: color })}
          opacity={subtitleSettings.opacity}
          onOpacityChange={(opacity) => setSubtitleSettings({ ...subtitleSettings, opacity })}
          languages={LANGUAGE_NAMES}
        />
      )}
    </div>
  );
}


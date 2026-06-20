import { useEffect, useRef, useState } from 'react';

export function ScrollReveal({ 
  children, 
  className = '', 
  animation = 'slide-up', // 'slide-up', 'fade-in', 'scale-in', 'slide-left', 'slide-right'
  duration = 750, 
  delay = 0,
  threshold = 0.1
}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const currentRef = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -60px 0px', // trigger slightly before entering the screen fully
      }
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  const animationClasses = {
    'slide-up': 'translate-y-12 opacity-0',
    'fade-in': 'opacity-0',
    'scale-in': 'scale-95 opacity-0',
    'slide-left': '-translate-x-12 opacity-0',
    'slide-right': 'translate-x-12 opacity-0',
  };

  const activeClasses = {
    'slide-up': 'translate-y-0 opacity-100',
    'fade-in': 'opacity-100',
    'scale-in': 'scale-100 opacity-100',
    'slide-left': 'translate-x-0 opacity-100',
    'slide-right': 'translate-x-0 opacity-100',
  };

  const baseTransition = `transition-all ease-out`;
  const inlineStyle = {
    transitionDuration: `${duration}ms`,
    transitionDelay: `${delay}ms`,
  };

  return (
    <div
      ref={ref}
      className={`${baseTransition} ${
        isIntersecting ? activeClasses[animation] : animationClasses[animation]
      } ${className}`}
      style={inlineStyle}
    >
      {children}
    </div>
  );
}

export default ScrollReveal;

import React from 'react';

const Loading = ({
  size = 'md',
  variant = 'spinner',
  text = '',
  className = '',
  fullScreen = false
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const Spinner = () => (
    <div className={`spinner ${sizes[size]}`}></div>
  );

  const Dots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`bg-blue-600 rounded-full animate-bounce ${
            size === 'sm' ? 'w-2 h-2' : 
            size === 'md' ? 'w-3 h-3' : 
            size === 'lg' ? 'w-4 h-4' : 'w-5 h-5'
          }`}
          style={{
            animationDelay: `${i * 0.1}s`
          }}
        ></div>
      ))}
    </div>
  );

  const Pulse = () => (
    <div className={`bg-blue-600 rounded-full animate-pulse ${sizes[size]}`}></div>
  );

  const LoadingComponent = () => {
    switch (variant) {
      case 'dots':
        return <Dots />;
      case 'pulse':
        return <Pulse />;
      default:
        return <Spinner />;
    }
  };

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <LoadingComponent />
      {text && (
        <p className="mt-3 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

export default Loading;

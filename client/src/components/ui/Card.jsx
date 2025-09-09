import React from 'react';

const Card = ({
  children,
  className = '',
  hover = false,
  padding = true,
  header,
  footer,
  ...props
}) => {
  const baseClasses = 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden';
  const hoverClasses = hover ? 'transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer' : '';
  
  const cardClasses = `${baseClasses} ${hoverClasses} ${className}`;

  return (
    <div className={cardClasses} {...props}>
      {header && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          {header}
        </div>
      )}
      <div className={padding ? 'px-6 py-4' : ''}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;

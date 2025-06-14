import React from "react";
import { theme } from "../../styles/theme";

const Card = ({ children, variant = "default", className = "", ...props }) => {
  const baseStyles =
    "bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-200";

  const variants = {
    default: "hover:shadow-md",
    elevated: "shadow-md hover:shadow-lg",
    bordered: "border border-gray-200",
    flat: "shadow-none",
  };

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = "", ...props }) => (
  <div className={`px-6 py-4 border-b border-gray-100 ${className}`} {...props}>
    {children}
  </div>
);

const CardBody = ({ children, className = "", ...props }) => (
  <div className={`px-6 py-4 ${className}`} {...props}>
    {children}
  </div>
);

const CardFooter = ({ children, className = "", ...props }) => (
  <div className={`px-6 py-4 border-t border-gray-100 ${className}`} {...props}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;

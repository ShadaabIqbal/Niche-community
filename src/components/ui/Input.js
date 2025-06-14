import React from "react";
import { theme } from "../../styles/theme";

const Input = ({ label, error, icon, className = "", ...props }) => {
  const baseStyles =
    "w-full px-4 py-2 text-gray-900 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200";
  const errorStyles = "border-error-500 focus:ring-error-500";
  const normalStyles =
    "border-gray-300 focus:border-primary-500 focus:ring-primary-500";
  const iconStyles = icon ? "pl-10" : "";

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={`${baseStyles} ${
            error ? errorStyles : normalStyles
          } ${iconStyles} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
    </div>
  );
};

export default Input;

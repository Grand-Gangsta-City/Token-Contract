import React from 'react';

interface InputFieldProps {
  label: string;
  prefix?: string;
  suffix?: string;
  type?: string;
  step?: string;
  min?: number;
  register: any;
  required?: boolean;
  errors?: any;
}

const InputField: React.FC<InputFieldProps> = ({ label, prefix, suffix, type = 'text', step, min, register, required, errors }) => {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-sm font-medium text-light">{label}</label>
      <div className="flex items-center">
        {prefix && <span className="px-2 py-1 bg-gray-800 text-light rounded-l-md">{prefix}</span>}
        <input
          className="flex-grow px-3 py-2 bg-gray-800 text-light rounded-none focus:outline-none focus:ring-2 focus:ring-gold"
          type={type}
          step={step}
          min={min}
          {...register(label, { required })}
        />
        {suffix && <span className="px-2 py-1 bg-gray-800 text-light rounded-r-md">{suffix}</span>}
      </div>
      {errors && <span className="text-red-500 text-xs mt-1">This field is required</span>}
    </div>
  );
};

export default InputField;
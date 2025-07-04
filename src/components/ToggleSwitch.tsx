import React from 'react';

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  labelPosition?: 'left' | 'right';
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  label,
  labelPosition = 'right',
  disabled = false,
}) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const cursorClass = disabled ? 'cursor-not-allowed' : 'cursor-pointer';

  const switchJsx = (
    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
        <input
            type="checkbox"
            name={id}
            id={id}
            checked={checked}
            onChange={handleToggle}
            disabled={disabled}
            className={`toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none ${cursorClass} ${checked ? 'right-0 border-sky-600' : 'left-0 border-gray-400'}`}
        />
        <label
            htmlFor={id}
            className={`toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 ${cursorClass} ${checked ? 'bg-sky-600' : 'bg-gray-300'}`}
        ></label>
         <style>{`
            .toggle-checkbox:checked {
                right: 0;
                border-color: #0284c7; /* sky-600 */
            }
            .toggle-checkbox:checked + .toggle-label {
                background-color: #0284c7; /* sky-600 */
            }
        `}</style>
    </div>
  );

  return (
    <label htmlFor={id} className={`flex items-center ${cursorClass}`}>
      {label && labelPosition === 'left' && <span className="mr-2 text-sm font-medium text-gray-700">{label}</span>}
      {switchJsx}
      {label && labelPosition === 'right' && <span className="text-sm font-medium text-gray-700">{label}</span>}
    </label>
  );
};

export default ToggleSwitch;
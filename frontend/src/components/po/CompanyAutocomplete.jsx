import { useRef, useState } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside.js'
import { useCompanyOptionsQuery } from '@/hooks/useCompanyOptionsQuery.js'
import { useDebouncedValue } from '@/hooks/useDebouncedValue.js'

/**
 * @typedef {{ id: number, company_name: string, username: string }} CompanyOption
 */

/**
 * Text field that searches existing buyer accounts by name. `value` is the
 * chosen company (or null); typing again clears the choice until a new
 * option is picked, so the form can never hold a name that isn't an account.
 *
 * @param {{
 *   id?: string,
 *   value: CompanyOption | null,
 *   onChange: (company: CompanyOption | null) => void,
 *   disabled?: boolean,
 *   invalid?: boolean,
 * }} props
 */
export function CompanyAutocomplete({ id, value, onChange, disabled, invalid }) {
  const containerRef = useRef(null)
  const containerRefs = useRef([containerRef]).current
  const [text, setText] = useState(value?.company_name ?? '')
  const [isOpen, setIsOpen] = useState(false)

  useClickOutside(isOpen, containerRefs, () => setIsOpen(false))

  const search = useDebouncedValue(text.trim(), 250)
  const { data: options = [], isFetching } = useCompanyOptionsQuery(search, { enabled: isOpen })

  function handleInput(event) {
    setText(event.target.value)
    setIsOpen(true)
    if (value) onChange(null)
  }

  /** @param {CompanyOption} company */
  function handleSelect(company) {
    setText(company.company_name)
    setIsOpen(false)
    onChange(company)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        disabled={disabled}
        value={text}
        onChange={handleInput}
        onFocus={() => setIsOpen(true)}
        placeholder="Ketik untuk mencari nama perusahaan"
        className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
          invalid
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-[#D97745] focus:ring-[#D97745]'
        }`}
      />

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-gray-400">
              {isFetching ? 'Mencari...' : 'Perusahaan tidak ditemukan.'}
            </li>
          ) : (
            options.map((company) => (
              <li key={company.id} role="option" aria-selected={value?.id === company.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(company)}
                  className="flex w-full flex-col px-3 py-2 text-left hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">{company.company_name}</span>
                  <span className="text-xs text-gray-400">{company.username}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

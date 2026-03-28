import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("system")
    } else {
      setTheme("light")
    }
  }

  const getIcon = () => {
    if (theme === "dark") {
      return <Moon className="h-[1.2rem] w-[1.2rem]" />
    }
    return <Sun className="h-[1.2rem] w-[1.2rem]" />
  }

  const getLabel = () => {
    if (theme === "light") return "Light"
    if (theme === "dark") return "Dark"
    return "System"
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={toggleTheme}
      className="gap-2"
    >
      {getIcon()}
      <span className="text-xs">{getLabel()}</span>
    </Button>
  )
}

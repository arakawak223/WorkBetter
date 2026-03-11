export function Footer() {
  return (
    <footer className="border-t bg-muted/40 py-8">
      <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} WorkBetter. All rights reserved.</p>
      </div>
    </footer>
  )
}

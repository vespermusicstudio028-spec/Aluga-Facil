import re

with open('src/pages/Payments.tsx', 'r') as f:
    content = f.read()

# Fix the incorrect component `<RefreshCcw, MessageCircle size={20}`
content = content.replace("<RefreshCcw,  MessageCircle size={20}", "<RefreshCcw size={20}")

# Find the second occurrence of getWhatsAppReminderLink block and remove it
# It starts at "  const getWhatsAppReminderLink" inside the map function
pattern = re.compile(r'(\s+const titular = tenant\?\.residents\.find\(r => r\.isTitular\);)\s+const getWhatsAppReminderLink.*?(return `https://wa\.me/\${phone}\?text=\${encodeURIComponent\(text\)}`;\s+};\s+)(return \()', re.DOTALL)
content = re.sub(pattern, r'\1\n                  \3', content)

# Now we need to add the WhatsApp icon to the Actions column for pending/late payments
action_pattern = re.compile(r'(<button\s+onClick=\{\(\) => handleMarkAsPaid\(p\.id\)\}.*?</button>\s*\n\s*\})', re.DOTALL)

# In the map function, we have property and tenant available.
# We will inject a new button before the <MoreVertical /> button
whatsapp_btn = """
                          {p.status !== 'paid' && (
                            <a 
                              href={getWhatsAppReminderLink(p, tenant, property)}
                              target="_blank" rel="noopener noreferrer"
                              className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all flex items-center justify-center"
                              title="Enviar Lembrete"
                            >
                              <MessageCircle size={18} />
                            </a>
                          )}
"""
content = re.sub(r'(<button className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg hover:bg-slate-200 transition-all">\s*<MoreVertical size=\{18\} />\s*</button>)', whatsapp_btn + r'\n                          \1', content)

# ensure we import MessageCircle correctly. The previous sed replaced RefreshCcw with RefreshCcw,\n MessageCircle
# wait, it replaced RefreshCcw with RefreshCcw,\n  MessageCircle. Let's make sure it's correct.
content = content.replace("RefreshCcw,\n  MessageCircle size={20} className={isLoading ? 'animate-spin' : ''} />", "RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />")

with open('src/pages/Payments.tsx', 'w') as f:
    f.write(content)

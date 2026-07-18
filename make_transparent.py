from PIL import Image

def make_transparent(input_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    datas = img.getdata()
    
    newData = []
    # Remover fundo branco (RGB > 240)
    for item in datas:
        if item[0] > 230 and item[1] > 230 and item[2] > 230:
            newData.append((255, 255, 255, 0)) # Transparente
        else:
            newData.append(item)
            
    img.putdata(newData)
    
    # Cortar sobras transparentes
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    # Transformar em um quadrado perfeito (centralizado)
    width, height = img.size
    new_size = max(width, height) + 40 # margem
    square_img = Image.new("RGBA", (new_size, new_size), (255, 255, 255, 0))
    square_img.paste(img, ((new_size - width) // 2, (new_size - height) // 2))
    
    # Salvar versão 192x192 para favicon
    img_192 = square_img.copy()
    img_192.thumbnail((192, 192), Image.Resampling.LANCZOS)
    img_192.save("public/favicon.png", "PNG")
    
    # Salvar versão 512x512 para PWA (celular)
    img_512 = square_img.copy()
    img_512.thumbnail((512, 512), Image.Resampling.LANCZOS)
    img_512.save("public/logo512.png", "PNG")

print("Gerando logos...")
make_transparent("public/logocanvas AlugaFacil.png")
print("Pronto!")

import glob 
files = glob.glob('**/*.py', recursive=True) 
for f in files: 
    data = open(f, 'rb').read() 
    if b'\x00' in data: 
        print('CORRUPTED:', f) 
        open(f, 'wb').write(data.replace(b'\x00', b'')) 
        print('FIXED:', f) 

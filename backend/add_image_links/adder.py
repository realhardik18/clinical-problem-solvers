import json
with open('data.json','r') as f:
    data_obj=json.load(f)
with open('images.json','r') as f:
    images=json.load(f)
urls=data_obj.keys()
data={}
for entry in images:
    data[entry['filename']]=entry['url']

# Fix: iterate over a list of keys and update each entry in data_obj
for url in list(data_obj.keys()):
    slide = data_obj[url]['slide']
    data_obj[url]['slide_url'] = data.get(slide)
print(data_obj)
with open('final.json','w') as file:
    json.dump(data_obj, file, indent=4)
vids=[2, 12, 30, 40, 145, 155, 161, 174, 190, 224, 240, 249, 267, 291, 317, 394, 411, 432, 475, 488, 534, 541, 560, 581, 717, 758, 791, 831, 887, 920, 980, 984, 985, 987, 988, 989, 1024, 1027, 1030, 1036, 1052, 1087, 1094, 1095, 1096, 1097, 1098, 1099, 1100, 1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108, 1109, 1110, 1111, 1112, 1113, 1114, 1115, 1116, 1117, 1118, 1119, 1120, 1121, 1122, 1123, 1124, 1125, 1126, 1127, 1128, 1129, 1130, 1131, 1132, 1133, 1134, 1135, 1136, 1137, 1138, 1139, 1140, 1141, 1142, 1143, 1144, 1145, 1146, 1147, 1148, 1149, 1150, 1151, 1152, 1153, 1154, 1155, 1156, 1157, 1158, 1159, 1160, 1161, 1162, 1163, 1164, 1165, 1166, 1167, 1168, 1169, 1170, 1171, 1172, 1173, 1174, 1175, 1176, 1177, 1178, 1179, 1180, 1181, 1182, 1183, 1184, 1185, 1186, 1187, 1188, 1189, 1190, 1191, 1192, 1193, 1194, 1195, 1196, 1197, 1198, 1199, 1200, 1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208, 1209, 1210, 1211, 1212, 1213, 1214, 1215, 1216, 1217, 1218, 1219, 1220, 1221, 1222, 1223, 1224, 1225, 1226, 1227, 1228, 1229, 1230, 1231, 1232, 1233, 1234, 1235, 1236]
with open('urls.txt','r') as file:
    data=file.read().split("\n")
print(data)
urls=[data[i] for i in vids][:-1]
#print(urls)
    
from youtube_transcript_api import YouTubeTranscriptApi
import time
import yt_dlp
import json

def get_video_info(video_id):    
    url = f"https://www.youtube.com/watch?v={video_id}"

    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'forcejson': True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    vid_info={
        "title": info.get("title"),        
        "upload_date": info.get("upload_date"),
        "duration": info.get("duration"),
        "view_count": info.get("view_count"),
        "like_count": info.get("like_count"),
        "tags": info.get("tags"),
        "description": info.get("description"),
        "thumbnail": info.get("thumbnail"),
    }
    return vid_info

failed=[]
for index,url in enumerate(urls,start=1):
    found=False
    count=0    
    video_id = url[::-1][0:11][::-1] 
    print(f'trying for: {video_id} {index}/{len(urls)}')   
    while not found:
        try:
            transcript_data = YouTubeTranscriptApi.get_transcript(video_id)
            found=True
            video_data={
                'metadata':get_video_info(video_id),
                'transcript_data':transcript_data
            }
            with open(f'data/{index}.json','w',encoding='utf-8') as file:
                json.dump(video_data,file,indent=2)
            print(f'success! {index}/{len(urls)}')            
        except Exception as e:
            print(f'error! trying again {index}/{len(urls)}')
            time.sleep(3)          
            count+=1
        if count>10:
            found=True
            failed.append(index)
print(failed)

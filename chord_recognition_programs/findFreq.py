import pyaudio
import numpy as np
from audioop import rms

CHUNK = 4096
RATE = 44100

# 將頻率轉成音名的函式
def get_note_name(thefreq, note_freq) :
    result = []
    # 把讀入的頻率和 dict 裡的頻率做比對
    # 取絕對值最小(及最接近的頻率)的音
    for i in note_freq :
        result.append([abs(i - thefreq), i])
    nowNote = min(result)
    print(note_freq[nowNote[1]])


# use a Blackman window
window = np.blackman(CHUNK)
# open stream
p = pyaudio.PyAudio()
stream = p.open(
    format = pyaudio.paInt16,
    channels = 1,
    rate = RATE,
    input = True,
    frames_per_buffer = CHUNK
) #uses default input device

# 建立最所有音的頻率和音名 dict
# key 是頻率 value 是音名
note_freq = {
    82.4100 : 'E', 87.3100 : 'F', 92.5000 : '#F', 98.0000 : 'G', 103.830 : '#G', 110.000 : 'A', 116.540 : '#A', 123.470 : 'B', 130.810 : 'C', 138.590 : '#C', 146.830 : 'D', 155.560 : '#D', 164.810 : 'E', 174.610 : 'F', 185.000 : '#F', 196.000 : 'G', 207.650 : '#G', 220.000 : 'A', 233.080 : '#A', 246.940 : 'B', 261.630 : 'C', 277.180 : '#C', 293.660 : 'D', 311.130 : '#D', 329.630 : 'E', 349.230 : 'F', 369.990 : '#F', 392.000 : 'G', 415.300 : '#G', 440.000 : 'A', 466.160 : '#A', 493.880 : 'B', 523.250 : 'C', 554.370 : '#C', 587.330 : 'D', 622.250 : '#D', 659.250 : 'E', 698.460 : 'F', 739.990 : '#F', 783.990 : 'G', 830.610 : '#G', 880.000 : 'A', 932.330 : '#A', 987.770 : 'B', 1046.50 : 'C', 1108.73 : '#C', 1174.66 : 'D'
}

# play stream and find the frequency of each CHUNK
while True :
    # 把音訊串流存進 data
    # stream read 一次會讀 CHUNK 個資料
    data = stream.read(CHUNK)
    print(rms(data, 2))

    # 把 data 轉成 np array
    # 由於 data 裡的資料型態是 bytes, 算是字串, 所以用 fromstring
    data = np.fromstring(data, dtype=np.int16) * window

    # Take the fft and square each value
    fftData = abs(np.fft.rfft(data)) ** 2
    # find the maximum
    which = fftData[1:].argmax() + 1

    # 檢測聲音的分貝
    # db=np.average(np.abs(data))*2
    # bars="#"*int(50*db/2**16)
    # print("%05f %s"%(db,bars))
    # db = 20*np.log10(np.sqrt(np.mean(np.absolute(data)**2)))
    # print(db)
    # print(audioop.rms(data, 2))

    # use quadratic interpolation around the max
    if which != len(fftData) - 1:
        y0, y1, y2 = np.log(fftData[which-1:which + 2:])
        x1 = (y2 - y0) * 0.5 / (2 * y1 - y2 - y0)
        # find the frequency and output it
        thefreq = (which + x1) * RATE / CHUNK
        if thefreq == 0 :
            continue
        print("The freq is %f Hz." % (thefreq))
        # 呼叫函數尋找音名
        get_note_name(thefreq, note_freq)
    else:
        thefreq = which*RATE/CHUNK
        if thefreq == 0 :
            continue
        print("The freq is %f Hz." % (thefreq))
        # 呼叫函數尋找音名
        get_note_name(thefreq, note_freq)


stream.close()
p.terminate()
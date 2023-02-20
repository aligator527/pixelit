import { Button } from "antd"
import { fetchFile } from "@ffmpeg/ffmpeg"
import { sliderValueToVideoTime } from "../utils/utils"
import pixelit  from "../utils/pixelit"

function VideoConversionButton({
    videoPlayerState,
    sliderValues,
    videoFile,
    ffmpeg,
    onConversionStart = () => {},
    onConversionEnd = () => {},
    onGifCreated = () => {},
}) {
    const PixelIt = async () => {
        // starting the conversion process
        onConversionStart(true)

        const inputFileName = "gif.mp4"
        const outputFileName = "out.mp4"

        // writing the video file to memory
        ffmpeg.FS("writeFile", inputFileName, await fetchFile(videoFile))

        const [min, max] = sliderValues
        const minTime = sliderValueToVideoTime(videoPlayerState.duration, min)
        const maxTime = sliderValueToVideoTime(videoPlayerState.duration, max)

        let frameArray;

        // cutting the video and converting it to GIF with a FFMpeg command
        //await ffmpeg.run("-i", inputFileName, "-ss", `${minTime}`, "-to", `${maxTime}`, "-f", "gif", outputFileName)

        // Extract frames
        await ffmpeg.run('-i', inputFileName, '-vf', `select='between(t\,0\,99)`, '-vsync', '0','frames%d.jpg')
        // Extract audio
        await ffmpeg.run('-i', inputFileName, 'audio.mp3')

        // Write images to memory
        frameArray = ffmpeg.FS("readdir", '/').filter((f) => f.endsWith('.jpg'))

        let pixelimage = async function(arrayFrames, currentFrame) {
            if (arrayFrames.length === 0) return false;
            if (arrayFrames.length === currentFrame) {
                await ffmpeg.run('-framerate', '30', '-pattern_type', 'glob', '-i', 'pixel_*.jpg', '-i', 'audio.mp3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'out.mp4');
                // reading the resulting file
                const data = ffmpeg.FS("readFile", outputFileName)

                // converting the GIF file created by FFmpeg to a valid image URL
                const gifUrl = URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }))
                onGifCreated(gifUrl)

                // ending the conversion process
                onConversionEnd(false)

                return false;
            }
                if (typeof currentFrame == 'undefined'){
                    currentFrame = 1;
                }
                let unframed_image = document.getElementById("pixelitimg")
                let cvs = document.getElementById("pixelitcanvas")
                let ctx = cvs.getContext("2d")
                let data = ffmpeg.FS('readFile', arrayFrames[currentFrame - 1])
                unframed_image.src = URL.createObjectURL(new Blob([data.buffer], { type: 'image/jpg'}))
                unframed_image.onload = () => {
                    let px = new pixelit(
                        {
                            to: cvs,
                            from: unframed_image,
                            scale: 8
                        }
                    )
                    px.draw().pixelate()

                    let b64image = cvs.toDataURL('image/jpeg', 1);
                    ffmpeg.FS('writeFile', `pixel_${currentFrame}.jpg`, b64image)

                    pixelimage(frameArray, currentFrame+1);
                }            
                
        }
        pixelimage(frameArray, 1)
    }

    return <Button onClick={() => PixelIt()}>Pixel It!</Button>
}

export default VideoConversionButton

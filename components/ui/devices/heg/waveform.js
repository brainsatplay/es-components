    export const style = {width:'100vw', height:'300px'}

    export const webaudio = null
    export const data = null
    export const canvas = null
    export const ctx = null

    export const onrender = function () { 
        if (!this.canvas) this.canvas = document.createElement('canvas')
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        let ctx = this.canvas.getContext('2d');
        this.ctx = ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.esElement.appendChild(this.canvas)
    }
    

    export const animation = function() {

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        let x = 0;
        let sliceWidth = (this.canvas.width * 1.0) / 512;

        if(this.data) {

            this.ctx.lineWidth = 2;
                
            this.ctx.strokeStyle = 'limegreen'
            this.ctx.beginPath();

            for (let i = 0; i < 512; i++) {
                let v = 1 - this.data.buffer[i] / this.data.localMax;
                let y = (v * this.canvas.height + this.canvas.height)*0.5;

                if (i === 0) {
                    this.ctx.moveTo(x, y)
                } else {
                    this.ctx.lineTo(x, y)
                }

                x += sliceWidth;
            }
        }

        this.ctx.lineTo(this.canvas.width, this.canvas.height )
        this.ctx.stroke()

        if(this.webaudio) {
            this.webaudio.analyser.getByteFrequencyData(this.webaudio.audioFFTBuffer);           
            this.ctx.strokeStyle = 'royalblue'
            this.ctx.beginPath()

            x = 0

            for (let i = 0; i < 512; i++) {
                let v = this.webaudio.audioFFTBuffer[i] / 255.0
                let y = (this.canvas.height - v * this.canvas.height) 

                if (i === 0) {
                    this.ctx.moveTo(x, y)
                } else {
                    this.ctx.lineTo(x, y)
                }

                x += sliceWidth;
            }

            this.ctx.lineTo(this.canvas.width, this.canvas.height )
            this.ctx.stroke();
        }
    }

    export default (...input) => input
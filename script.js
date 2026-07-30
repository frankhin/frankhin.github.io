const c = document.getElementById("stars");
const ctx = c.getContext("2d");

function resize(){
    c.width = window.innerWidth;
    c.height = window.innerHeight;
}

resize();

window.addEventListener("resize", resize);

const stars = [];

for(let i=0;i<250;i++){
    stars.push({
        x:Math.random()*window.innerWidth,
        y:Math.random()*window.innerHeight,
        r:Math.random()*2
    });
}

function animate(){

    ctx.clearRect(0,0,c.width,c.height);

    ctx.fillStyle="white";

    stars.forEach(star=>{

        ctx.beginPath();
        ctx.arc(star.x,star.y,star.r,0,Math.PI*2);
        ctx.fill();

        star.y += 0.05 + star.r*0.02;

        if(star.y>window.innerHeight){
            star.y=0;
            star.x=Math.random()*window.innerWidth;
        }

    });

    requestAnimationFrame(animate);
}

animate();

document.getElementById("begin").addEventListener("click",()=>{

    document.getElementById("intro").classList.add("hidden");

    document.getElementById("universe").classList.remove("hidden");

});

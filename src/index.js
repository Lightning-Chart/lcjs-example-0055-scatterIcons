const lcjs = require('@lightningchart/lcjs')
const { lightningChart, Themes, emptyFill, AxisTickStrategies, AxisScrollStrategies, emptyLine, IndividualPointFill, ColorHEX } = lcjs

const imgFlag = new Image()
imgFlag.crossOrigin = ''
imgFlag.src = document.head.baseURI + 'examples/assets/0055/flag.png'

let channels = new Array(3).fill(0).map((_, i) => ({ label: `Channel ${i + 1}` }))
const lc = lightningChart({
            resourcesBaseUrl: new URL(document.head.baseURI).origin + new URL(document.head.baseURI).pathname + 'resources/',
        })
const chart = lc
    .ChartXY({
        theme: Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined,
    })
    .setTitle('Drag different colored annotations from left')
chart.getDefaultAxisY().dispose()
channels = channels.map((ch, i) => {
    const iStack = channels.length - (i + 1)
    const axisY = chart
        .addAxisY({ iStack })
        .setDefaultInterval({ start: 0, end: 1 })
        .setMargins(iStack > 0 ? 5 : 0, iStack < channels.length - 1 ? 5 : 0)
    const series = chart
        .addPointLineAreaSeries({ axisY, dataPattern: 'ProgressiveX' })
        .setAreaFillStyle(emptyFill)
        .setMaxSampleCount(100_000)
    return { axisY, series }
})
const timeAxis = chart
    .getDefaultAxisX()
    .setTickStrategy(AxisTickStrategies.Time)
    .setScrollStrategy(AxisScrollStrategies.progressive)
    .setDefaultInterval((state) => ({
        end: state.dataMax ?? 0,
        start: (state.dataMax ?? 0) - 15_000,
        stopAxisAfter: false,
    }))

setInterval(() => {
    const x = performance.now()
    channels.forEach((ch) => {
        const y = Math.random()
        ch.series.appendSample({ x, y })
    })
}, 1000 / 60)

// Drag & drop annotations
const annotationMenu = document.createElement('div')
chart.engine.container.append(annotationMenu)
annotationMenu.style.position = 'absolute'
annotationMenu.style.display = 'flex'
annotationMenu.style.flexDirection = 'row'
annotationMenu.style.margin = '10px'
;[
    { color: '#ff0000', label: 'Red' },
    { color: '#00ff00', label: 'Green' },
    { color: '#0000ff', label: 'Blue' },
].forEach((item) => {
    const option = document.createElement('span')
    annotationMenu.append(option)
    option.style.height = option.style.width = '20px'
    option.style.fontFamily = 'Segoe UI'
    option.style.backgroundColor = item.color
    option.style.marginRight = '10px'
    option.style.border = `solid ${chart.getTheme().isDark ? 'white' : 'black'} 1px`
    option.style.borderRadius = '5px'
    option.style.cursor = 'pointer'
    option.draggable = true
    option.ondragstart = (event) => {
        event.dataTransfer.setData('text', JSON.stringify(item))
    }
})
const uiAxisY = chart
    .addAxisY({ opposite: true })
    .setTickStrategy(AxisTickStrategies.Empty)
    .setStrokeStyle(emptyLine)
    .setPointerEvents(false)
    .setInterval({ start: 0, end: 1 })
const pointSeries = chart
    .addPointLineAreaSeries({
        axisY: uiAxisY,
        dataPattern: null,
        colors: true,
    })
    .setAreaFillStyle(emptyFill)
    .setStrokeStyle(emptyLine)
    .setPointFillStyle(new IndividualPointFill())
    .setPointShape(chart.engine.addCustomIcon(imgFlag))
    .setPointSize(0.2)
    .setPointAlignment({ x: -1, y: 1 })
    .setAutoScrollingEnabled(false)
    .setCursorEnabled(false)
chart.engine.container.ondragover = (event) => event.preventDefault()
chart.engine.container.ondrop = (event) => {
    const item = JSON.parse(event.dataTransfer.getData('text'))
    const x = chart.translateCoordinate(event, chart.coordsAxis).x
    // Annotation is built from 2 components:
    // 1. ConstantLine (vertical line created on X axis)
    // 2. A single sample in Point series with Icon shape and individual sample colors.
    timeAxis.addConstantLine(false).setValue(x)
    pointSeries.appendSample({ x, y: 1, color: ColorHEX(item.color) })
}

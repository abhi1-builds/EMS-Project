import dash
from dash import dcc, html
from dash.dependencies import Input, Output
import plotly.graph_objects as go
import requests

# ESP32 API address
ESP32_IP = "http://192.168.1.50/data"

app = dash.Dash(__name__)

temperature_data = []
humidity_data = []
air_quality_data = []
co2_data = []

# Function to get data from ESP32
def get_sensor_data():
    try:
        response = requests.get(ESP32_IP)
        data = response.json()
        return data
    except:
        return {
            "temperature": 0,
            "humidity": 0,
            "air_quality": 0,
            "co2": 0
        }

# Dashboard layout
app.layout = html.Div([

    html.H1("Environmental Monitoring Dashboard", style={'textAlign': 'center'}),

    dcc.Interval(
        id='interval-component',
        interval=3000,
        n_intervals=0
    ),

    html.Div([
        dcc.Graph(id='temp_gauge'),
        dcc.Graph(id='humidity_gauge'),
    ]),

    html.Div([
        dcc.Graph(id='air_gauge'),
        dcc.Graph(id='co2_gauge'),
    ]),

    html.Div([
        dcc.Graph(id='temp_chart'),
        dcc.Graph(id='humidity_chart'),
    ]),

    html.Div([
        dcc.Graph(id='air_chart'),
        dcc.Graph(id='co2_chart'),
    ])
])

# Update dashboard every 3 seconds
@app.callback(
    [
        Output('temp_gauge','figure'),
        Output('humidity_gauge','figure'),
        Output('air_gauge','figure'),
        Output('co2_gauge','figure'),
        Output('temp_chart','figure'),
        Output('humidity_chart','figure'),
        Output('air_chart','figure'),
        Output('co2_chart','figure')
    ],
    [Input('interval-component','n_intervals')]
)

def update_dashboard(n):

    data = get_sensor_data()

    temp = data["temperature"]
    hum = data["humidity"]
    air = data["air_quality"]
    co2 = data["co2"]

    temperature_data.append(temp)
    humidity_data.append(hum)
    air_quality_data.append(air)
    co2_data.append(co2)

    temp_gauge = go.Figure(go.Indicator(
        mode="gauge+number",
        value=temp,
        title={'text': "Temperature (°C)"},
        gauge={'axis': {'range': [0, 50]}}
    ))

    humidity_gauge = go.Figure(go.Indicator(
        mode="gauge+number",
        value=hum,
        title={'text': "Humidity (%)"},
        gauge={'axis': {'range': [0, 100]}}
    ))

    air_gauge = go.Figure(go.Indicator(
        mode="gauge+number",
        value=air,
        title={'text': "Air Quality"},
        gauge={'axis': {'range': [0, 500]}}
    ))

    co2_gauge = go.Figure(go.Indicator(
        mode="gauge+number",
        value=co2,
        title={'text': "CO2 Level (ppm)"},
        gauge={'axis': {'range': [0, 2000]}}
    ))

    temp_chart = go.Figure()
    temp_chart.add_scatter(y=temperature_data, mode='lines', name='Temperature')

    humidity_chart = go.Figure()
    humidity_chart.add_scatter(y=humidity_data, mode='lines', name='Humidity')

    air_chart = go.Figure()
    air_chart.add_scatter(y=air_quality_data, mode='lines', name='Air Quality')

    co2_chart = go.Figure()
    co2_chart.add_scatter(y=co2_data, mode='lines', name='CO2')

    return (
        temp_gauge,
        humidity_gauge,
        air_gauge,
        co2_gauge,
        temp_chart,
        humidity_chart,
        air_chart,
        co2_chart
    )

# Run server
if __name__ == "__main__":
    app.run(debug=True)
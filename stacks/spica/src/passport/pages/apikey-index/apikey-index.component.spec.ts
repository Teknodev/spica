import {HttpClientTestingModule} from "@angular/common/http/testing";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatIconModule} from "@angular/material/icon";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatTableModule} from "@angular/material/table";
import {MatToolbarModule} from "@angular/material/toolbar";
import {By} from "@angular/platform-browser";
import {NoopAnimationsModule} from "@angular/platform-browser/animations";
import {RouterTestingModule} from "@angular/router/testing";
import {MatAwareDialogModule} from "@spica-client/material";
import {CanInteractDirectiveTest} from "@spica-client/passport/directives/can-interact.directive";
import {ApiKey} from "../../interfaces/apikey";
import {ApiKeyService, MockApiKeyService} from "../../services/apikey.service";
import {ApiKeyIndexComponent} from "./apikey-index.component";

describe("ApiKeyIndexComponent", () => {
  let component: ApiKeyIndexComponent;
  let fixture: ComponentFixture<ApiKeyIndexComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [
        MatIconModule,
        MatToolbarModule,
        MatCardModule,
        MatTableModule,
        MatPaginatorModule,
        RouterTestingModule,
        MatButtonModule,
        MatAwareDialogModule,
        HttpClientTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        {
          provide: ApiKeyService,
          useValue: new MockApiKeyService()
        }
      ],
      declarations: [ApiKeyIndexComponent, CanInteractDirectiveTest]
    }).compileComponents();

    fixture = TestBed.createComponent(ApiKeyIndexComponent);
    component = fixture.componentInstance;
    await component["apiKeyService"].insertOne({
      key: "testkey",
      name: "testname",
      active: true,
      description: "testdescription",
      policies: []
    } as ApiKey);

    fixture.detectChanges();
  });

  it("should show apikeys", () => {
    const cells = fixture.debugElement.queryAll(By.css("table td"));
    expect(cells[0].nativeElement.textContent).toBe("testkey");
    expect(cells[1].nativeElement.textContent).toBe("testname");
    expect(cells[2].nativeElement.textContent).toBe("testdescription");
  });

  it("should delete apikey", async () => {
    component.deleteApiKey("0");

    await fixture.whenStable();
    fixture.detectChanges();

    const cells = fixture.debugElement.queryAll(By.css("mat-mdc-table mat-cell"));
    expect(cells).toEqual([]);
  });
});
